package envoy.authz

import rego.v1

# Default deny - explicit allow required
default allow := false

# Allow request if user ID is in the allowlist
allow if {
	user_id in data.allowed_user_ids
}

# Extract user ID from JWT payload in Envoy metadata
user_id := sub if {
	# Get JWT payload from Envoy's dynamic metadata
	jwt_payload := input.attributes.metadataContext.filterMetadata["envoy.filters.http.jwt_authn"].jwt_payload

	# Extract the 'sub' (subject) claim which contains the user ID
	sub := jwt_payload.sub
}
