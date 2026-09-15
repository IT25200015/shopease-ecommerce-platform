package com.shopease.shopease_backend.config;

import com.shopease.shopease_backend.security.AccountUserDetailsService;
import com.shopease.shopease_backend.security.JwtAuthenticationFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * SecurityConfig – JWT-Based Stateless Security Configuration
 * =============================================================
 *
 * VIVA: Core design principles of this security config:
 *
 * 1. STATELESS (no sessions):
 *    We use SessionCreationPolicy.STATELESS. Spring will NEVER create an
 *    HttpSession to store authentication state. Every request must carry
 *    its own JWT. This is the fundamental difference between JWT auth and
 *    traditional session-based auth.
 *
 * 2. CSRF DISABLED:
 *    Cross-Site Request Forgery protection is only needed for browser-based
 *    apps that use session cookies. Since we use Bearer tokens (in headers,
 *    not cookies), CSRF is not applicable and we disable it.
 *
 * 3. CORS CONFIGURED:
 *    Our React dev server runs on http://localhost:5173. Without explicit
 *    CORS configuration, the browser will block all requests from this
 *    origin to our API at http://localhost:8080 (same-origin policy).
 *
 *    BUG FIX: allowedHeaders must be an explicit list (not "*") when
 *    allowCredentials is true. The CORS spec forbids wildcard + credentials.
 *    We also expose the Authorization header explicitly.
 *
 * 4. ENDPOINT AUTHORIZATION RULES:
 *    - OPTIONS /**                → PUBLIC  (browser preflight must never be blocked)
 *    - /api/auth/**               → PUBLIC  (login/register — no token exists yet)
 *    - GET /api/products/**       → PUBLIC  (browsing products doesn't require login)
 *    - GET /api/categories/**     → PUBLIC  (guest category browsing)
 *    - /api/orders/checkout       → CUSTOMER role required
 *    - /api/payments/process      → CUSTOMER role required
 *    - Everything else            → REQUIRES a valid JWT token
 *
 * 5. JWT FILTER POSITION:
 *    Our JwtAuthenticationFilter is added BEFORE Spring's built-in
 *    UsernamePasswordAuthenticationFilter. If the JWT is valid, we set
 *    the SecurityContext early and Spring Security doesn't interfere.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity   // Activates @PreAuthorize / @PostAuthorize on controller methods
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final AccountUserDetailsService userDetailsService;

    // ─── FILTER CHAIN ─────────────────────────────────────────────────────────

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // Disable CSRF (not needed for stateless JWT APIs — see explanation above)
            .csrf(AbstractHttpConfigurer::disable)

            // Configure CORS using our CorsConfigurationSource bean below
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // Define which endpoints are public vs. protected
            .authorizeHttpRequests(auth -> auth

                // ── FIX: Allow all OPTIONS preflight requests unconditionally ──
                // Browsers send an OPTIONS request before every cross-origin POST/PUT/DELETE.
                // If Spring Security blocks it (because no JWT is present), the actual
                // request never fires and the frontend sees a network error.
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                // ── Public endpoints (no token required) ───────────────────────
                // Auth endpoints — login/register must be accessible without a token
                .requestMatchers("/api/auth/**").permitAll()
                // Product browsing — guest users can view products and categories
                .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/categories/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/banners/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/campaigns/**").permitAll()

                // ── Role-protected endpoints ───────────────────────────────────
                // Checkout and payment require the CUSTOMER role specifically.
                // hasRole("CUSTOMER") checks for authority "ROLE_CUSTOMER" (set in
                .requestMatchers("/api/orders/checkout", "/api/payments/process", "/api/orders/customer/**").hasRole("CUSTOMER")

                // ── All remaining requests require any valid JWT ────────────────
                .anyRequest().authenticated()
            )

            // Stateless session policy — Spring never creates or uses HttpSession
            .sessionManagement(session ->
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )

            // Register our DaoAuthenticationProvider (BCrypt + our UserDetailsService)
            .authenticationProvider(authenticationProvider())

            // Insert JWT filter BEFORE Spring's built-in username/password filter
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    // ─── CORS CONFIGURATION ───────────────────────────────────────────────────

    /**
     * CORS: Cross-Origin Resource Sharing
     *
     * VIVA: Why do we need this?
     *   Browsers enforce the Same-Origin Policy (SOP): JavaScript running on
     *   http://localhost:5173 (React) cannot call http://localhost:8080 (Spring)
     *   unless the server explicitly allows it via CORS headers.
     *
     * Our React Vite server runs on port 5173, Spring runs on port 8080.
     * They have different ports → different origins → SOP blocks them.
     * This CORS config tells the browser: "requests from 5173 are allowed."
     *
     * VIVA: Why not use allowedHeaders("*") here?
     *   The CORS specification explicitly forbids using the wildcard "*" for
     *   allowedHeaders when allowCredentials is true. The browser will reject
     *   the preflight response and block the actual request. We must list each
     *   header we allow explicitly: Authorization, Content-Type, Accept.
     *
     * NOTE: Do NOT add @CrossOrigin on individual controllers. That annotation
     * defaults to origins="*" which also conflicts with allowCredentials=true
     * and results in the browser blocking real (non-preflight) requests.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Allowed origins — must match exactly where the React app is served from
        config.setAllowedOrigins(List.of(
            "http://localhost:5173",   // Vite dev server (default)
           "http://localhost:5174",   // Vite dev server (alternate port)
            "http://localhost:3000"    // CRA or other dev server fallback
        ));

        // All HTTP methods used by the frontend
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));

        // BUG FIX: Explicit header list required when allowCredentials = true.
        // "Authorization" carries the JWT Bearer token.
        // "Content-Type" is needed for JSON POST bodies.
        // "Accept" is a standard browser-sent header.
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));

        // Expose Authorization so the frontend can read it from responses if needed
        config.setExposedHeaders(List.of("Authorization"));

        // Allow the browser to include credentials (Authorization header)
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config); // Apply to all paths
        return source;
    }

    // ─── AUTHENTICATION PROVIDER ──────────────────────────────────────────────

    /**
     * DaoAuthenticationProvider wires together:
     *   - Our UserDetailsService (loads user from DB by email)
     *   - BCryptPasswordEncoder (verifies the password hash)
     *
     * VIVA: What does BCrypt do?
     *   BCrypt is a one-way hashing function designed specifically for passwords.
     *   It includes a random "salt" and a configurable "cost factor" (work factor),
     *   making brute-force and rainbow-table attacks computationally infeasible.
     *   The same password hashed twice produces DIFFERENT hashes — by design.
     */
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    /**
     * BCryptPasswordEncoder bean — available for injection everywhere.
     * Used in AccountService to hash passwords on registration.
     * Used by DaoAuthenticationProvider to verify passwords on login.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * AuthenticationManager — Spring's entry point for triggering authentication.
     * Extracted from the AuthenticationConfiguration to make it injectable.
     * Used in AuthController to authenticate login requests programmatically.
     */
    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }
}
