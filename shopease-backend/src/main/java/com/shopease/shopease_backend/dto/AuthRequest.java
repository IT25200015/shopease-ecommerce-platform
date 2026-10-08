package com.shopease.shopease_backend.dto;

/**
 * AuthRequest DTO – Login Request Body
 * =====================================
 * VIVA: Why a DTO instead of using the Account entity directly?
 *
 * 1. SECURITY: The Account entity contains sensitive fields (role, status,
 *    passwordHash, createdAt, relationships). Accepting a raw Account object
 *    lets a malicious client send any of those fields and overwrite them.
 *    A DTO exposes ONLY the fields we need — email and password.
 *
 * 2. SEPARATION: The API contract (what the client sends) is separate from
 *    the database schema (what we store). They can evolve independently.
 *
 * Record syntax (Java 16+): compact, immutable DTO — perfect for request bodies.
 */
public record AuthRequest(
        String email,
        String password
) {}
