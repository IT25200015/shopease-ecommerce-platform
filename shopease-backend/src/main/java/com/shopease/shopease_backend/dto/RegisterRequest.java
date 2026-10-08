package com.shopease.shopease_backend.dto;

/**
 * RegisterRequest DTO – Registration Request Body
 * =================================================
 * Extends the login fields with fullName and role.
 * Role is validated in the service layer (must be CUSTOMER or SHOP_OWNER).
 *
 * Record syntax gives us an immutable value object with auto-generated
 * constructor, getters, equals, hashCode, and toString — no boilerplate.
 */
public record RegisterRequest(
        String fullName,
        String email,
        String password,
        String role       // Expected: "CUSTOMER" or "SHOP_OWNER"
) {}
