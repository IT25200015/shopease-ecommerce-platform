package com.shopease.shopease_backend.security;

import com.shopease.shopease_backend.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * AccountUserDetailsService – Spring Security User Loader
 * =========================================================
 *
 * VIVA: Why does Spring Security need this?
 *
 * Spring Security's authentication machinery works with a generic abstraction
 * called UserDetails. It doesn't know about our Account entity. This service
 * is the BRIDGE — it loads our Account from the database and wraps it in a
 * UserDetails object that Spring Security understands.
 *
 * Flow:
 *   JwtAuthenticationFilter calls loadUserByUsername(email)
 *   → We query AccountRepository.findByEmail(email)
 *   → We build a Spring Security User with email, passwordHash, and ROLE_xxx authority
 *   → Spring Security uses this to set the SecurityContext
 *
 * VIVA: What is a GrantedAuthority?
 *   It represents a permission/role granted to the user. Spring Security's
 *   convention is to prefix roles with "ROLE_" (e.g., "ROLE_CUSTOMER").
 *   This allows expressions like @PreAuthorize("hasRole('SHOP_OWNER')").
 */
@Service
@RequiredArgsConstructor
public class AccountUserDetailsService implements UserDetailsService {

    private final AccountRepository accountRepository;

    /**
     * Loads user by email (we use email as the "username" in our system).
     * Called by Spring Security during both form-login and JWT validation.
     *
     * @param email the user's email address (used as the unique identifier)
     * @return UserDetails object consumed by Spring Security
     * @throws UsernameNotFoundException if no account with this email exists
     */
    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        return accountRepository.findByEmail(email)
                .map(account -> new User(
                        account.getEmail(),
                        account.getPasswordHash(),
                        // GrantedAuthority list — we map our role string to "ROLE_<ROLE>"
                        // e.g., "CUSTOMER" → "ROLE_CUSTOMER"
                        List.of(new SimpleGrantedAuthority("ROLE_" + account.getRole()))
                ))
                .orElseThrow(() -> new UsernameNotFoundException(
                        "No account found with email: " + email
                ));
    }
}
