# Envoy Configuration Templates

This directory contains templated Envoy proxy configuration files that can be rendered with different variables for various environments.

## Files

- `envoy.yaml.j2` - Main Envoy configuration template
- `envoy-hmac-secret.yaml.j2` - HMAC secret configuration template
- `envoy-token-secret.yaml.j2` - OAuth token secret configuration template

## Usage

### 1. Create your variables file

The `variables.yaml` file should look like this:

```yaml
# OAuth Configuration
oauth_redirect_uri: "http://localhost:8080/oauth2/callback"
oauth_client_id: "your-client-id.apps.googleusercontent.com"
oauth_client_secret: "your-client-secret" # pragma: allowlist secret

# Cookie Secret (generate with: openssl rand -base64 32)
cookie_secret: "your-cookie-secret-here" # pragma: allowlist secret
```

### 2. Render the templates

Use the just command to render all templates:

```bash
just render-envoy-config config/variables.development.yaml
```

This will generate:

- `config/envoy.yaml`
- `config/envoy-hmac-secret.yaml`
- `config/envoy-token-secret.yaml`

### 3. Use the rendered configs

The generated files are automatically used by Docker Compose when mounting the config directory to the Envoy container.

## Required Variables

All four variables are required:

- `oauth_redirect_uri` - OAuth callback URL
- `oauth_client_id` - Google OAuth client ID
- `oauth_client_secret` - Google OAuth client secret
- `cookie_secret` - Cookie signing secret

## Security Notes

⚠️ **Never commit variables files to version control!**

As they contain sensitive secrets, the following files are gitignored:

- `variables.*` (your actual secrets)
- `out/` (generated config files)

## Generating Secrets

Generate a secure cookie secret:

```bash
openssl rand -base64 32
```

## Requirements

- Jinja2

To install manually via Homebrew:

```bash
brew install jinja2-cli
```
