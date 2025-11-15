# Guía de Distribución de Rikuest

## Problema Común: Error "Launch failed" en macOS

Si al intentar ejecutar la aplicación en macOS aparece el error:
```
Launch failed. Error Domain=RBSRequestErrorDomain Code=5
NSPOSIXErrorDomain Code=111 "Launchd job spawn failed"
```

Esto se debe a que macOS **Gatekeeper** está bloqueando la aplicación porque:
1. No está firmada con un certificado de desarrollador
2. Tiene el atributo de "cuarentena" (quarantine) al descargarse desde internet

## Soluciones

### Opción 1: Preparar la aplicación antes de distribuir (Recomendado)

Antes de compartir el binario, ejecuta:

```bash
make wails-prepare-macos
```

Este comando:
- Remueve el atributo de cuarentena
- Firma la aplicación con una firma ad-hoc (permite ejecución sin certificado)

### Opción 2: Instrucciones para el usuario final

Si ya compartiste el binario sin prepararlo, el usuario puede solucionarlo ejecutando:

```bash
# Remover cuarentena
xattr -d com.apple.quarantine /path/to/Rikuest-arm64.app

# O permitir manualmente desde Terminal
sudo spctl --master-disable  # Deshabilitar Gatekeeper (NO recomendado)
```

**O desde la interfaz gráfica:**
1. Click derecho en la aplicación → "Abrir"
2. Aparecerá un diálogo de advertencia
3. Click en "Abrir" nuevamente

### Opción 3: Firmar con certificado de desarrollador (Para distribución profesional)

Si tienes un certificado de Apple Developer:

```bash
make wails-sign-dev CERT="Developer ID Application: Tu Nombre"
```

Esto requiere:
- Cuenta de Apple Developer ($99/año)
- Certificado instalado en tu Mac

## Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `make wails-remove-quarantine` | Remueve el atributo de cuarentena |
| `make wails-sign-adhoc` | Firma con firma ad-hoc (temporal) |
| `make wails-sign-dev CERT="..."` | Firma con certificado de desarrollador |
| `make wails-prepare-macos` | Prepara la app (quita cuarentena + firma ad-hoc) |

## Verificar el estado de la aplicación

Para verificar si la aplicación está firmada:

```bash
codesign -dv --verbose=4 build/bin/Rikuest-arm64.app
```

Para verificar el atributo de cuarentena:

```bash
xattr -l build/bin/Rikuest-arm64.app
```

## Notas Importantes

1. **Firma Ad-hoc**: Permite ejecución pero macOS mostrará una advertencia la primera vez
2. **Certificado de Desarrollador**: Elimina todas las advertencias y permite distribución profesional
3. **Quarantine**: Se agrega automáticamente cuando se descarga desde internet o se copia desde otro Mac

## Distribución Recomendada

Para distribuir la aplicación:

1. **Compilar**: `make wails-build-prod`
2. **Preparar**: `make wails-prepare-macos`
3. **Crear DMG** (opcional): Usar herramientas como `create-dmg`
4. **Compartir**: El usuario podrá ejecutarla sin problemas

## Troubleshooting

### La aplicación aún no se abre después de prepararla

1. Verifica que el binario tenga permisos de ejecución:
   ```bash
   chmod +x build/bin/Rikuest-arm64.app/Contents/MacOS/Rikuest
   ```

2. Verifica que no haya problemas con el bundle:
   ```bash
   codesign --verify --verbose build/bin/Rikuest-arm64.app
   ```

3. Revisa los logs del sistema:
   ```bash
   log show --predicate 'process == "Rikuest"' --last 5m
   ```

