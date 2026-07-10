package services

import (
	"regexp"

	"rikuest/internal/database"
	"rikuest/internal/models"
)

var variablePattern = regexp.MustCompile(`\{\{(\w+)\}\}`)

// VariableResolver resolves {{varName}} placeholders in request fields.
// Resolution order (highest priority last): active environment variables,
// then folder variables from the root ancestor down to the request's folder.
type VariableResolver struct {
	db *database.DB
}

func NewVariableResolver(db *database.DB) *VariableResolver {
	return &VariableResolver{db: db}
}

// BuildVariableMap assembles the merged variable map for a given request context.
func (r *VariableResolver) BuildVariableMap(projectID int, folderID *int) (map[string]string, error) {
	vars := make(map[string]string)

	// Layer 1: active environment variables (lowest priority)
	activeEnv, err := r.db.GetActiveEnvironment(projectID)
	if err != nil {
		return vars, err
	}
	if activeEnv != nil {
		for _, v := range activeEnv.Variables {
			vars[v.Key] = v.Value
		}
	}

	// Layer 2: folder variables. Folders form a tree, so the whole ancestor
	// chain applies: root-first, so deeper folders override their ancestors
	// (and all of them override env vars).
	if folderID != nil {
		chain, err := r.db.GetFolderAncestry(*folderID)
		if err != nil {
			return vars, nil
		}
		for _, id := range chain {
			folderVars, err := r.db.GetFolderVariables(id)
			if err != nil {
				continue
			}
			for _, v := range folderVars {
				vars[v.Key] = v.Value
			}
		}
	}

	return vars, nil
}

// Resolve substitutes {{varName}} in text. Unknown variables are left unchanged.
func (r *VariableResolver) Resolve(text string, vars map[string]string) string {
	return variablePattern.ReplaceAllStringFunc(text, func(match string) string {
		key := match[2 : len(match)-2]
		if val, ok := vars[key]; ok {
			return val
		}
		return match
	})
}

// ResolveRequest returns a copy of req with all {{}} placeholders substituted.
// The original request is never mutated.
func (r *VariableResolver) ResolveRequest(req *models.Request, vars map[string]string) *models.Request {
	resolved := *req // shallow copy

	resolved.URL = r.Resolve(req.URL, vars)
	resolved.Body = r.Resolve(req.Body, vars)
	resolved.BearerToken = r.Resolve(req.BearerToken, vars)
	resolved.ApiKeyName = r.Resolve(req.ApiKeyName, vars)
	resolved.ApiKeyValue = r.Resolve(req.ApiKeyValue, vars)

	resolvedHeaders := make(map[string]string, len(req.Headers))
	for k, v := range req.Headers {
		resolvedHeaders[r.Resolve(k, vars)] = r.Resolve(v, vars)
	}
	resolved.Headers = resolvedHeaders

	resolvedParams := make([]models.QueryParam, len(req.QueryParams))
	for i, p := range req.QueryParams {
		resolvedParams[i] = models.QueryParam{
			Key:     r.Resolve(p.Key, vars),
			Value:   r.Resolve(p.Value, vars),
			Enabled: p.Enabled,
		}
	}
	resolved.QueryParams = resolvedParams

	resolved.BasicAuth = models.BasicAuth{
		Username: r.Resolve(req.BasicAuth.Username, vars),
		Password: r.Resolve(req.BasicAuth.Password, vars),
	}

	resolvedFormData := make([]models.FormData, len(req.FormData))
	for i, f := range req.FormData {
		resolvedFormData[i] = models.FormData{
			Key:   r.Resolve(f.Key, vars),
			Value: r.Resolve(f.Value, vars),
		}
	}
	resolved.FormData = resolvedFormData

	return &resolved
}
