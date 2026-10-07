package com.shopease.shopease_backend.controller;

import com.shopease.shopease_backend.model.Account;
import com.shopease.shopease_backend.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST Controller for Account management.
 * ARCHITECTURE RULE: This controller ONLY calls AccountService.
 * It NEVER touches AccountRepository directly.
 * All business logic lives in the Service layer.
 */
@RestController
@RequestMapping("/api/accounts")
@CrossOrigin(origins = "*")   // Allow requests from React frontend on any port
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @GetMapping
    public ResponseEntity<List<Account>> getAllAccounts() {
        return ResponseEntity.ok(accountService.getAllAccounts());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Account> getAccountById(@PathVariable Integer id) {
        return accountService.getAccountById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/email/{email}")
    public ResponseEntity<Account> getAccountByEmail(@PathVariable String email) {
        return accountService.getAccountByEmail(email)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/role/{role}")
    public ResponseEntity<List<Account>> getAccountsByRole(@PathVariable String role) {
        return ResponseEntity.ok(accountService.getAccountsByRole(role));
    }

    /** POST /api/accounts — Register a new account */
    @PostMapping
    public ResponseEntity<Account> registerAccount(@RequestBody Account account) {
        Account saved = accountService.registerAccount(account);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    /** PUT /api/accounts/{id} — Update an account */
    @PutMapping("/{id}")
    public ResponseEntity<Account> updateAccount(@PathVariable Integer id, @RequestBody Account updatedData) {
        return ResponseEntity.ok(accountService.updateAccount(id, updatedData));
    }

    /** PUT /api/accounts/me — Update logged in user account info */
    @PutMapping("/me")
    public ResponseEntity<Account> updateMyAccount(
            @RequestBody Account updatedData,
            @AuthenticationPrincipal UserDetails principal) {
        // Fetch the user's account by email (username in UserDetails)
        Account existing = accountService.getAccountByEmail(principal.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("Account not found for email: " + principal.getUsername()));
        
        // Preserve role and email to prevent privilege escalation via this endpoint
        updatedData.setEmail(existing.getEmail());
        updatedData.setRole(existing.getRole());
        
        return ResponseEntity.ok(accountService.updateAccount(existing.getAccountID(), updatedData));
    }

    /** PATCH /api/accounts/{id}/status?value=SUSPENDED — Change account status */
    @PatchMapping("/{id}/status")
    public ResponseEntity<Account> updateStatus(@PathVariable Integer id, @RequestParam String value) {
        return ResponseEntity.ok(accountService.updateAccountStatus(id, value));
    }

    /** PUT /api/accounts/password — Change password for logged in user */
    @PutMapping("/password")
    public ResponseEntity<?> updatePassword(
            @RequestBody Map<String, String> passwords,
            @AuthenticationPrincipal UserDetails principal) {
        try {
            String email = principal.getUsername();
            accountService.updatePassword(email, passwords.get("oldPassword"), passwords.get("newPassword"));
            return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAccount(@PathVariable Integer id) {
        accountService.deleteAccount(id);
        return ResponseEntity.noContent().build();
    }
}
