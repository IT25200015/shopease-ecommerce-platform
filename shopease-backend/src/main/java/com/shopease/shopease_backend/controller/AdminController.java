package com.shopease.shopease_backend.controller;

import com.shopease.shopease_backend.model.Account;
import com.shopease.shopease_backend.model.Shop;
import com.shopease.shopease_backend.service.AccountService;
import com.shopease.shopease_backend.service.ShopService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * AdminController – Dedicated endpoints for the Mall Administrator dashboard.
 *
 * VIVA DEFENSE: Why a separate AdminController instead of reusing AccountController?
 *   - Separation of Concerns: Admin actions (approve shops, suspend users) are
 *     distinct from user self-service actions (update own profile).
 *   - Security: In production, these endpoints would be locked down with
 *     @PreAuthorize("hasRole('ADMIN')") so only admins can access them.
 *   - Auditability: Grouping admin actions makes logging and compliance easier.
 */
@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private final AccountService accountService;
    private final ShopService shopService;

    // ─── DTOs ─────────────────────────────────────────────────────────────────
    public record UserDto(Integer accountID, String fullName, String email, String role, String status) {}
    public record ShopAdminResponseDto(Integer shopId, String shopName, String description, String status, String ownerName) {}
    public record ShopStatusUpdateRequest(String status) {}

    // ─── USER MANAGEMENT ──────────────────────────────────────────────────────

    /** GET /api/admin/users — List all registered users across all roles. */
    @GetMapping("/users")
    public ResponseEntity<List<UserDto>> getAllUsers() {
        try {
            List<UserDto> users = accountService.getAllAccounts().stream()
                    .map(a -> new UserDto(
                            a.getAccountID(),
                            a.getFullName() != null ? a.getFullName() : "Unknown",
                            a.getEmail(),
                            a.getRole(),
                            a.getStatus()
                    ))
                    .collect(Collectors.toList());
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            log.error("Admin API Error while fetching users: ", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /** GET /api/admin/users/role/{role} — Filter users by role (CUSTOMER, SHOP_OWNER, etc.) */
    @GetMapping("/users/role/{role}")
    public ResponseEntity<List<UserDto>> getUsersByRole(@PathVariable String role) {
        try {
            List<UserDto> users = accountService.getAccountsByRole(role).stream()
                    .map(a -> new UserDto(
                            a.getAccountID(),
                            a.getFullName() != null ? a.getFullName() : "Unknown",
                            a.getEmail(),
                            a.getRole(),
                            a.getStatus()
                    ))
                    .collect(Collectors.toList());
            return ResponseEntity.ok(users);
        } catch (Exception e) {
            log.error("Admin API Error while fetching users by role: ", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * PUT /api/admin/users/{id}/status
     * Body: { "status": "SUSPENDED" } or { "status": "ACTIVE" }
     *
     * Allows the admin to activate, suspend, or ban any user account.
     */
    @PutMapping("/users/{id}/status")
    public ResponseEntity<UserDto> updateUserStatus(
            @PathVariable Integer id,
            @RequestBody Map<String, String> body) {
        try {
            String status = body.get("status");
            if (status == null || status.isBlank()) {
                return ResponseEntity.badRequest().build();
            }
            Account a = accountService.updateAccountStatus(id, status.toUpperCase());
            return ResponseEntity.ok(new UserDto(
                    a.getAccountID(),
                    a.getFullName() != null ? a.getFullName() : "Unknown",
                    a.getEmail(),
                    a.getRole(),
                    a.getStatus()
            ));
        } catch (Exception e) {
            log.error("Admin API Error while updating user status: ", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // ─── SHOP MANAGEMENT ──────────────────────────────────────────────────────

    /** GET /api/admin/shops — List all shops (all statuses). */
    @GetMapping("/shops")
    public ResponseEntity<List<ShopAdminResponseDto>> getAllShops() {
        try {
            List<ShopAdminResponseDto> shops = shopService.getAllShops().stream()
                    .map(shop -> {
                        String ownerName = (shop.getOwner() != null && shop.getOwner().getFullName() != null) 
                                ? shop.getOwner().getFullName() : "Unknown";
                        return new ShopAdminResponseDto(
                                shop.getShopID(),
                                shop.getShopName() != null ? shop.getShopName() : "Unknown Shop",
                                shop.getDescription(),
                                shop.getStatus(),
                                ownerName
                        );
                    })
                    .collect(Collectors.toList());
            return ResponseEntity.ok(shops);
        } catch (Exception e) {
            log.error("Admin API Error while fetching shops: ", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /** GET /api/admin/shops/pending — List shops awaiting approval. */
    @GetMapping("/shops/pending")
    @Transactional(readOnly = true)
    public ResponseEntity<List<ShopAdminResponseDto>> getPendingShops() {
        try {
            // FIX: Shops are created with status "PENDING_REVIEW" (see ShopService.createShop).
            // The previous query for "PENDING" returned zero results, so the frontend
            // never received shopId values and sent shopId=undefined to the PUT endpoint.
            List<ShopAdminResponseDto> shops = shopService.getShopsByStatus("PENDING_REVIEW").stream()
                    .map(shop -> {
                        String ownerName = (shop.getOwner() != null && shop.getOwner().getFullName() != null)
                                ? shop.getOwner().getFullName() : "Unknown";
                        return new ShopAdminResponseDto(
                                shop.getShopID(),
                                shop.getShopName() != null ? shop.getShopName() : "Unknown Shop",
                                shop.getDescription(),
                                shop.getStatus(),
                                ownerName
                        );
                    })
                    .collect(Collectors.toList());
            return ResponseEntity.ok(shops);
        } catch (Exception e) {
            log.error("Admin API Error while fetching pending shops: ", e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * PUT /api/admin/shops/{id}/status
     * Body: { "status": "ACTIVE" } or { "status": "SUSPENDED" }
     *
     * Allows the admin to approve, suspend, or reactivate a vendor shop.
     */
    @PutMapping("/shops/{id}/status")
    public ResponseEntity<ShopAdminResponseDto> updateShopStatus(
            @PathVariable Integer id,
            @RequestBody ShopStatusUpdateRequest req) {
        try {
            String status = req.status();
            if (status == null || status.isBlank()) {
                return ResponseEntity.badRequest().build();
            }
            Shop s = shopService.updateShopStatus(id, status.toUpperCase());
            return ResponseEntity.ok(new ShopAdminResponseDto(
                    s.getShopID(),
                    s.getShopName() != null ? s.getShopName() : "Unknown Shop",
                    s.getDescription(),
                    s.getStatus(),
                    (s.getOwner() != null && s.getOwner().getFullName() != null) ? s.getOwner().getFullName() : "Unknown"
            ));
        } catch (Exception e) {
            log.error("Admin API Error while updating shop status: ", e);
            return ResponseEntity.internalServerError().build();
        }
    }
}
