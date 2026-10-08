package com.shopease.shopease_backend.controller;

import com.shopease.shopease_backend.dto.AuthRequest;
import com.shopease.shopease_backend.dto.AuthResponse;
import com.shopease.shopease_backend.dto.RegisterRequest;
import com.shopease.shopease_backend.model.Account;
import com.shopease.shopease_backend.model.Cart;
import com.shopease.shopease_backend.repository.AccountRepository;
import com.shopease.shopease_backend.repository.CartRepository;
import com.shopease.shopease_backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

/**
 * AuthController – Public Authentication Endpoints
 * ==================================================
 *
 * Base URL: /api/auth
 * All endpoints here are PUBLIC (no JWT required) — configured in SecurityConfig.
 *
 * VIVA: Why a SEPARATE AuthController instead of adding to AccountController?
 *
 *   Separation of Concerns:
 *   - AccountController = CRUD operations on accounts (admin/management use, requires auth)
 *   - AuthController    = Authentication operations (login/register, public endpoints)
 *   They have different URL prefixes, different security rules, and different concerns.
 *
 * VIVA: Authentication Flow:
 *
 *   REGISTER:
 *   Client → POST /api/auth/register { fullName, email, password, role }
 *   → Validate email uniqueness
 *   → BCrypt.encode(password) → store as passwordHash
 *   → Save Account to DB
 *   → Generate JWT with email + role
 *   → Return AuthResponse { token, role, email, fullName }
 *
 *   LOGIN:
 *   Client → POST /api/auth/login { email, password }
 *   → AuthenticationManager.authenticate() → triggers DaoAuthenticationProvider
 *   → DaoAuthenticationProvider calls UserDetailsService.loadUserByUsername(email)
 *   → Then BCrypt.matches(rawPassword, storedHash) — if fail → BadCredentialsException
 *   → If success → generate JWT
 *   → Return AuthResponse { token, role, email, fullName }
 */
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AuthController {

    private final AccountRepository accountRepository;
    private final CartRepository cartRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    // ─── REGISTER ─────────────────────────────────────────────────────────────

    /**
     * POST /api/auth/register
     *
     * Creates a new account, BCrypt-hashes the password, auto-creates a Cart
     * for CUSTOMER accounts, then returns a JWT so the user is immediately
     * logged in after registration (no separate login step needed).
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {

        // ── Validate role is acceptable ────────────────────────────────────────
        String role = request.role();
        if (role == null || (!role.equals("CUSTOMER") && !role.equals("SHOP_OWNER"))) {
            return ResponseEntity.badRequest()
                .body(Map.of("message", "Role must be CUSTOMER or SHOP_OWNER"));
        }

        // ── Check email uniqueness ─────────────────────────────────────────────
        if (accountRepository.existsByEmail(request.email())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("message", "An account with this email already exists."));
        }

        // ── Build and save the Account entity ─────────────────────────────────
        Account account = new Account();
        account.setFullName(request.fullName());
        account.setEmail(request.email());
        // BCrypt.encode() applies a one-way hash with random salt — NEVER reversible
        account.setPasswordHash(passwordEncoder.encode(request.password()));
        account.setRole(role);
        account.setStatus("ACTIVE");
        account.setCreatedAt(LocalDate.now());

        Account savedAccount = accountRepository.save(account);

        // ── Auto-create an empty Cart for new CUSTOMER accounts ────────────────
        // VIVA: Why do this here and not in AccountService?
        // AuthController handles the complete registration transaction.
        // AccountService.registerAccount() is used for admin-side creation
        // and has its own cart logic — we mirror it here for auth flow.
        if ("CUSTOMER".equals(role)) {
            Cart cart = new Cart();
            cart.setCustomer(savedAccount);
            cart.setUpdatedAt(LocalDate.now());
            cartRepository.save(cart);
        }

        // ── Generate JWT and return response ───────────────────────────────────
        String token = jwtUtil.generateToken(savedAccount.getEmail(), savedAccount.getRole());

        return ResponseEntity.status(HttpStatus.CREATED)
            .body(new AuthResponse(
                token,
                savedAccount.getRole(),
                savedAccount.getEmail(),
                savedAccount.getFullName(),
                savedAccount.getAccountID()
            ));
    }

    // ─── LOGIN ────────────────────────────────────────────────────────────────

    /**
     * POST /api/auth/login
     *
     * VIVA: Why use AuthenticationManager instead of verifying manually?
     *
     * AuthenticationManager is Spring Security's standard authentication pipeline.
     * It delegates to DaoAuthenticationProvider, which:
     *   1. Calls UserDetailsService.loadUserByUsername(email) — loads from DB
     *   2. Calls passwordEncoder.matches(rawPassword, storedHash) — verifies BCrypt
     *   3. Throws BadCredentialsException on failure — we catch it for a clean 401
     *
     * This keeps authentication logic in Spring Security's proven, audited code
     * rather than reimplementing it ourselves (less risk of security bugs).
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {
        try {
            // Triggers the full Spring Security authentication pipeline
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    request.email(),    // principal (username)
                    request.password()  // credentials (raw password)
                )
            );
        } catch (BadCredentialsException e) {
            // Return 401 Unauthorized with a user-friendly (non-leaking) message
            // VIVA: We say "Invalid credentials" not "Wrong password" — we don't
            // want to confirm whether the email exists or not (security best practice)
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Invalid email or password."));
        }

        // Authentication succeeded — load account details for the response
        Account account = accountRepository.findByEmail(request.email())
            .orElseThrow(); // Safe — we just authenticated successfully

        // Generate a new JWT token for this session
        String token = jwtUtil.generateToken(account.getEmail(), account.getRole());

        return ResponseEntity.ok(new AuthResponse(
            token,
            account.getRole(),
            account.getEmail(),
            account.getFullName(),
            account.getAccountID()
        ));
    }
}
