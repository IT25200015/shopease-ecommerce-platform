package com.shopease.shopease_backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * JwtAuthenticationFilter – Intercepts Every Incoming HTTP Request
 * =================================================================
 *
 * VIVA: Where does this filter sit in the Spring Security chain?
 *
 * Spring Security processes requests through a chain of filters. We insert
 * this filter BEFORE UsernamePasswordAuthenticationFilter (which handles
 * form-based login). If the JWT is valid, we set the SecurityContext early
 * and Spring Security skips its own authentication entirely.
 *
 * VIVA: What does OncePerRequestFilter guarantee?
 *   It ensures this filter executes EXACTLY ONCE per HTTP request, even
 *   in scenarios where a request is forwarded internally (e.g., error pages),
 *   preventing double-authentication attempts.
 *
 * VIVA: Full JWT validation flow for each request:
 *   1. Read "Authorization" header
 *   2. Check it starts with "Bearer "
 *   3. Extract the token string
 *   4. Validate signature + expiry via JwtUtil
 *   5. Load user from database (confirms user still exists & is active)
 *   6. Build a UsernamePasswordAuthenticationToken (authenticated=true)
 *   7. Store in SecurityContextHolder → all @PreAuthorize checks can now pass
 *   8. Call filterChain.doFilter() to continue the request
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtil jwtUtil;
    private final AccountUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {

        // ── Step 1: Read the Authorization header ──────────────────────────────
        final String authHeader = request.getHeader("Authorization");

        // ── Step 2: Early exit if there's no Bearer token ──────────────────────
        // If header is missing or doesn't start with "Bearer ", pass through.
        // The SecurityConfig will then reject the request if the endpoint requires auth.
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        // ── Step 3: Extract the JWT (strip "Bearer " prefix, 7 chars) ──────────
        final String jwt = authHeader.substring(7);

        // ── Step 4: Validate token and check SecurityContext is empty ──────────
        // We only authenticate if the context is empty — avoids re-processing
        // on requests that are already authenticated (e.g., test/internal forwards)
        if (!jwtUtil.isTokenValid(jwt) ||
                SecurityContextHolder.getContext().getAuthentication() != null) {
            filterChain.doFilter(request, response);
            return;
        }

        // ── Step 5: Extract email from token and load UserDetails from DB ──────
        // Why re-load from DB? To verify the user still exists and is ACTIVE.
        // The token alone doesn't know if the account was suspended after issue.
        final String email = jwtUtil.extractEmail(jwt);
        UserDetails userDetails = userDetailsService.loadUserByUsername(email);

        // ── Step 6: Build the Authentication token ─────────────────────────────
        // UsernamePasswordAuthenticationToken(principal, credentials, authorities)
        // credentials = null because we don't need the password once authenticated
        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                userDetails,
                null,
                userDetails.getAuthorities()
        );

        // Attach request details (IP address, session ID) for audit logging
        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

        // ── Step 7: Set authentication in SecurityContext ──────────────────────
        // After this line, Spring Security considers the user authenticated for
        // the duration of this request. All @PreAuthorize checks will pass.
        SecurityContextHolder.getContext().setAuthentication(authToken);

        // ── Step 8: Continue the filter chain ─────────────────────────────────
        filterChain.doFilter(request, response);
    }
}
