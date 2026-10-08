package com.shopease.shopease_backend.dto;

/**
 * AuthResponse DTO – Sent back to the React frontend on successful auth
 * =======================================================================
 * VIVA: What does the frontend do with this?
 *
 * 1. token    → stored in localStorage and attached to every API request
 *               via the Axios request interceptor (Authorization: Bearer <token>)
 *
 * 2. role     → used by the frontend to show/hide UI elements
 *               (e.g., only SHOP_OWNER sees the "Manage Shop" link)
 *
 * 3. email    → displayed in the Navbar user chip
 *
 * 4. fullName → displayed as the greeting ("Welcome, Arjun!")
 *
 * We deliberately DO NOT return the password hash — ever.
 */
public record AuthResponse(
        String token,
        String role,
        String email,
        String fullName,
        Integer accountID
) {}
