package com.shopease.shopease_backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Base64;
import java.util.Date;

/**
 * JwtUtil – JWT Token Generator & Validator
 * ==========================================
 *
 * VIVA DEFENSE: How does JWT work?
 *
 * A JWT (JSON Web Token) has 3 parts separated by dots:
 *   [Header].[Payload].[Signature]
 *
 *   Header   → algorithm used ("HS256") and token type ("JWT") — Base64Url encoded
 *   Payload  → "claims": data we embed (email, role, issued-at, expiry) — Base64Url encoded
 *   Signature → HMAC-SHA256(base64(header) + "." + base64(payload), secret_key)
 *
 * VIVA: Why is JWT "stateless"?
 *   The server does NOT store sessions. It only needs the secret key to verify
 *   the signature. The token itself carries all user info (self-contained).
 *   This makes it horizontally scalable — any server instance can validate it.
 *
 * VIVA: What's the difference between SIGNING and ENCRYPTING?
 *   We SIGN the token (HS256 = HMAC-SHA256). The payload is Base64-encoded,
 *   NOT encrypted — anyone can read it. But they CANNOT forge it without the
 *   secret key. For truly sensitive payloads, use JWE (JSON Web Encryption).
 *
 * @Component makes this a Spring bean so it can be @Autowired anywhere.
 * @Value reads from application.properties at runtime.
 */
@Component
public class JwtUtil {

    // ─── Secret key loaded from application.properties ─────────────────────────
    // @Value injects the property value at Spring container startup
    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-ms}")
    private long jwtExpirationMs;

    /**
     * Build the SecretKey object from our Base64-encoded secret string.
     *
     * VIVA: Keys.hmacShaKeyFor() ensures the key meets the minimum length
     * requirement for HS256 (256 bits = 32 bytes). If the key is too short,
     * JJWT throws a WeakKeyException — a security safeguard.
     */
    private SecretKey getSigningKey() {
        byte[] keyBytes = Base64.getDecoder().decode(jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    // ─── TOKEN GENERATION ──────────────────────────────────────────────────────

    /**
     * Generates a signed JWT token containing:
     *   - subject (sub): the user's email (unique identifier)
     *   - claim "role": the user's role (CUSTOMER, SHOP_OWNER, etc.)
     *   - issuedAt (iat): current timestamp
     *   - expiration (exp): current time + configured expiry duration
     *
     * The token is signed with HMAC-SHA256 using our secret key.
     *
     * @param email the authenticated user's email address
     * @param role  the user's role from the database
     * @return a compact JWT string: xxxxx.yyyyy.zzzzz
     */
    public String generateToken(String email, String role) {
        return Jwts.builder()
                .subject(email)                          // "sub" claim
                .claim("role", role)                     // Custom "role" claim
                .issuedAt(new Date())                    // "iat" claim
                .expiration(new Date(System.currentTimeMillis() + jwtExpirationMs)) // "exp" claim
                .signWith(getSigningKey())               // Signs with HS256
                .compact();                              // Serialises to String
    }

    // ─── TOKEN PARSING ─────────────────────────────────────────────────────────

    /**
     * Parses and validates the token, then returns all claims (the payload).
     * Throws JwtException if the token is invalid or expired — caught upstream.
     */
    private Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(getSigningKey())   // Set the key to verify signature
                .build()
                .parseSignedClaims(token)      // Parses & validates in one call
                .getPayload();
    }

    /**
     * Extracts the email (subject) from a valid token.
     * Used by the JwtAuthenticationFilter to identify the user.
     */
    public String extractEmail(String token) {
        return extractAllClaims(token).getSubject();
    }

    /**
     * Extracts the role claim from a valid token.
     * Used to build the GrantedAuthority list for Spring Security.
     */
    public String extractRole(String token) {
        return extractAllClaims(token).get("role", String.class);
    }

    // ─── TOKEN VALIDATION ──────────────────────────────────────────────────────

    /**
     * Returns true if the token has a valid signature AND has not expired.
     *
     * VIVA: What happens if someone tampers with the payload?
     *   The signature would no longer match → parseSignedClaims() throws
     *   SignatureException → we return false → the request is rejected (401).
     */
    public boolean isTokenValid(String token) {
        try {
            extractAllClaims(token); // Throws on invalid signature or expiry
            return true;
        } catch (Exception e) {
            // Covers: ExpiredJwtException, SignatureException, MalformedJwtException
            return false;
        }
    }
}
