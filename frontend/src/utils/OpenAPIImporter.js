import SwaggerParser from '@apidevtools/swagger-parser';
import yaml from 'js-yaml';
import { Buffer } from 'buffer';

// Make Buffer and global available for swagger-parser
if (typeof window !== 'undefined') {
  if (!window.Buffer) {
    window.Buffer = Buffer;
  }
  if (!window.global) {
    window.global = window;
  }
}

/**
 * Parse and validate an OpenAPI/Swagger specification
 * Supports both JSON and YAML formats
 * @param {string} content - The file content as string
 * @returns {Promise<Object>} - The parsed and validated OpenAPI spec
 */
export async function parseOpenAPI(content) {
  try {
    // Try to parse as JSON first
    let spec;
    try {
      spec = JSON.parse(content);
    } catch {
      // If not JSON, try YAML
      try {
        spec = yaml.load(content);
      } catch (yamlError) {
        throw new Error('Invalid file format. Expected JSON or YAML.'); // This error is caught and translated in the component
      }
    }

    // Validate and dereference the OpenAPI spec
    const api = await SwaggerParser.validate(spec);
    return api;
  } catch (error) {
    throw new Error(`Invalid OpenAPI specification: ${error.message}`);
  }
}

/**
 * Convert OpenAPI specification to Rikuest Request objects
 * @param {Object} openAPISpec - The parsed OpenAPI specification
 * @param {number} projectId - The project ID to associate requests with
 * @param {string} baseUrl - Optional base URL override
 * @returns {Array<Object>} - Array of request objects ready to be created
 */
export function convertToRequests(openAPISpec, projectId, baseUrl = '') {
  const requests = [];
  const paths = openAPISpec.paths || {};
  
  // Determine base URL from servers array or use provided baseUrl
  const servers = openAPISpec.servers || [];
  const defaultServer = baseUrl || (servers.length > 0 ? servers[0].url : '');

  Object.entries(paths).forEach(([path, pathItem]) => {
    if (!pathItem) return;

    // Get operations (GET, POST, PUT, DELETE, etc.)
    const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];
    
    methods.forEach(method => {
      const operation = pathItem[method];
      if (!operation) return;

      // Build request name
      const operationId = operation.operationId || `${method}_${path.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const summary = operation.summary || operationId;
      const tag = operation.tags && operation.tags.length > 0 ? operation.tags[0] : null;

      // Build URL - handle path parameters
      let fullPath = path.startsWith('/') ? path : `/${path}`;
      // Replace path parameters with example values or placeholders
      fullPath = fullPath.replace(/\{([^}]+)\}/g, (match, paramName) => {
        // Try to find the parameter definition
        const param = (operation.parameters || []).find(p => p.name === paramName && p.in === 'path');
        if (param && param.schema && param.schema.example !== undefined) {
          return param.schema.example;
        }
        // Use a placeholder if no example
        return `{${paramName}}`;
      });
      
      const url = defaultServer ? `${defaultServer}${fullPath}` : fullPath;

      // Extract query parameters
      const queryParams = (operation.parameters || [])
        .filter(param => param.in === 'query')
        .map(param => ({
          key: param.name,
          value: param.schema?.default || param.schema?.example || '',
          description: param.description || ''
        }));

      // Extract headers
      const headers = {};
      (operation.parameters || [])
        .filter(param => param.in === 'header')
        .forEach(param => {
          headers[param.name] = param.schema?.default || param.schema?.example || '';
        });

      // Extract request body
      let body = '';
      let bodyType = 'none';
      if (operation.requestBody) {
        const content = operation.requestBody.content || {};
        
        // Check for JSON body
        if (content['application/json'] || content['application/json; charset=utf-8']) {
          bodyType = 'json';
          const jsonContent = content['application/json'] || content['application/json; charset=utf-8'];
          const schema = jsonContent.schema;
          body = generateExampleFromSchema(schema) || '{}';
        } 
        // Check for form-urlencoded
        else if (content['application/x-www-form-urlencoded']) {
          bodyType = 'form';
          const formContent = content['application/x-www-form-urlencoded'];
          const schema = formContent.schema;
          if (schema && schema.properties) {
            // Convert form schema to form_data array
            const formData = Object.entries(schema.properties).map(([key, prop]) => ({
              key: key,
              value: prop.default || prop.example || '',
              description: prop.description || ''
            }));
            // Store as JSON string for now, will be converted later
            body = JSON.stringify(formData);
          }
        }
        // Check for multipart/form-data
        else if (content['multipart/form-data']) {
          bodyType = 'form';
          const multipartContent = content['multipart/form-data'];
          const schema = multipartContent.schema;
          if (schema && schema.properties) {
            const formData = Object.entries(schema.properties).map(([key, prop]) => ({
              key: key,
              value: prop.default || prop.example || '',
              description: prop.description || ''
            }));
            body = JSON.stringify(formData);
          }
        }
      }

      // Convert form body string to form_data array if needed
      let formData = [];
      if (bodyType === 'form' && body) {
        try {
          formData = JSON.parse(body);
          body = ''; // Clear body when using form_data
        } catch {
          formData = [];
        }
      }

      requests.push({
        project_id: projectId,
        name: summary,
        method: method.toUpperCase(),
        url: url,
        headers: headers,
        body: body,
        body_type: bodyType,
        query_params: queryParams,
        auth_type: 'none',
        bearer_token: '',
        basic_auth: { username: '', password: '' },
        form_data: formData,
        tag: tag // Store tag for folder creation
      });
    });
  });

  return requests;
}

/**
 * Generate example JSON from a JSON schema
 * @param {Object} schema - The JSON schema object
 * @returns {string} - JSON string example
 */
function generateExampleFromSchema(schema) {
  if (!schema) return '{}';
  
  // If there's an example, use it
  if (schema.example !== undefined) {
    return typeof schema.example === 'string' 
      ? schema.example 
      : JSON.stringify(schema.example, null, 2);
  }

  // If there's a default, use it
  if (schema.default !== undefined) {
    return typeof schema.default === 'string'
      ? schema.default
      : JSON.stringify(schema.default, null, 2);
  }

  // Generate from schema type
  if (schema.type === 'object' && schema.properties) {
    const example = {};
    Object.entries(schema.properties).forEach(([key, prop]) => {
      if (prop.example !== undefined) {
        example[key] = prop.example;
      } else if (prop.default !== undefined) {
        example[key] = prop.default;
      } else if (prop.type === 'string') {
        example[key] = prop.enum ? prop.enum[0] : '';
      } else if (prop.type === 'number' || prop.type === 'integer') {
        example[key] = prop.minimum !== undefined ? prop.minimum : 0;
      } else if (prop.type === 'boolean') {
        example[key] = false;
      } else if (prop.type === 'array') {
        example[key] = prop.items ? [generateValueFromSchema(prop.items)] : [];
      } else if (prop.type === 'object') {
        example[key] = prop.properties ? generateExampleFromSchema(prop) : {};
      }
    });
    return JSON.stringify(example, null, 2);
  }

  // Handle array type
  if (schema.type === 'array' && schema.items) {
    const itemExample = generateValueFromSchema(schema.items);
    return JSON.stringify([itemExample], null, 2);
  }

  // Handle simple types
  if (schema.type === 'string') {
    return schema.enum ? `"${schema.enum[0]}"` : '""';
  }

  return '{}';
}

/**
 * Generate a single value from a schema
 * @param {Object} prop - The schema property
 * @returns {any} - The generated value
 */
function generateValueFromSchema(prop) {
  if (prop.example !== undefined) return prop.example;
  if (prop.default !== undefined) return prop.default;
  
  switch (prop.type) {
    case 'string':
      return prop.enum ? prop.enum[0] : '';
    case 'number':
    case 'integer':
      return prop.minimum !== undefined ? prop.minimum : 0;
    case 'boolean':
      return false;
    case 'array':
      return prop.items ? [generateValueFromSchema(prop.items)] : [];
    case 'object':
      if (prop.properties) {
        const obj = {};
        Object.entries(prop.properties).forEach(([key, p]) => {
          obj[key] = generateValueFromSchema(p);
        });
        return obj;
      }
      return {};
    default:
      return null;
  }
}

