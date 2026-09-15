package com.shopease.shopease_backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * GlobalExceptionHandler – Centralized Error Handling
 * =====================================================
 *
 * VIVA: Why do we need @RestControllerAdvice?
 *
 * Without this, when a service throws an exception (e.g., IllegalArgumentException
 * from OrderService), Spring returns a raw 500 HTML page or a default JSON body
 * with no "message" field — which means the React frontend's:
 *   err.response?.data?.message
 * comes back as undefined and the user sees a generic "Payment processing failed."
 *
 * With @RestControllerAdvice, we intercept EVERY unhandled exception thrown from
 * ANY @RestController and convert it into a clean JSON object:
 *   {
 *     "timestamp": "2026-09-01T18:00:00",
 *     "status": 400,
 *     "error": "Bad Request",
 *     "message": "No cart found for customer ID: 7"
 *   }
 *
 * BUG FIX (from original):
 *   - The catch-all handler was returning "An unexpected error occurred. Please
 *     contact support." — hiding the real exception from both the developer and
 *     the frontend. Fixed to expose ex.getMessage().
 *   - No logging existed at all. Added SLF4J log.error() calls so every exception
 *     prints a full stack trace to the Spring Boot console for debugging.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    // ─── Helper: builds the standard error response map ──────────────────────

    private Map<String, Object> buildError(HttpStatus status, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        return body;
    }

    // ─── Handlers ─────────────────────────────────────────────────────────────

    /**
     * Handles IllegalArgumentException — thrown when input data is invalid.
     *
     * Examples from OrderService:
     *   - "Customer not found with email: x@y.com"
     *   - "No cart found for customer ID: 7"
     *   - "Promo code 'SAVE10' is not valid."
     *   - "Order not found: 42"
     *   - "Invalid card number. Sandbox requires at least 12 digits."
     *
     * → Returns HTTP 400 Bad Request with the exact message.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        log.error("[400 BAD REQUEST] {}", ex.getMessage(), ex);
        return ResponseEntity
            .status(HttpStatus.BAD_REQUEST)
            .body(buildError(HttpStatus.BAD_REQUEST, ex.getMessage()));
    }

    /**
     * Handles IllegalStateException — thrown when a business rule is violated.
     *
     * Examples from OrderService / PaymentService:
     *   - "Cannot place an order with an empty cart."
     *   - "Insufficient stock for product 'Laptop Pro'."
     *   - "Order is not in PENDING status. Current status: CONFIRMED"
     *   - "Order #5 is already DELIVERED and cannot be modified."
     *
     * → Returns HTTP 409 Conflict (state conflict, not bad input).
     */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(IllegalStateException ex) {
        log.error("[409 CONFLICT] {}", ex.getMessage(), ex);
        return ResponseEntity
            .status(HttpStatus.CONFLICT)
            .body(buildError(HttpStatus.CONFLICT, ex.getMessage()));
    }

    /**
     * Catch-all handler for any unexpected runtime exception.
     *
     * This catches JPA constraint violations (DataIntegrityViolationException),
     * NullPointerExceptions, or anything not covered above.
     *
     * BUG FIX: The original returned a generic string hiding the real cause.
     * Now exposes ex.getMessage() so the frontend can display it and the
     * developer can see the full stack trace in the Spring Boot console.
     *
     * → Returns HTTP 500 Internal Server Error.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGenericException(Exception ex) {
        // ── DEBUGGING TIP ──────────────────────────────────────────────────────
        // The full stack trace is printed below in the Spring Boot console.
        // Look for lines like:
        //   [500 INTERNAL ERROR] Unexpected exception: ...
        //   Caused by: org.hibernate.exception.ConstraintViolationException: ...
        // This tells you exactly which DB column or constraint is failing.
        log.error("[500 INTERNAL ERROR] Unexpected exception: {}", ex.getMessage(), ex);
        return ResponseEntity
            .status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(buildError(HttpStatus.INTERNAL_SERVER_ERROR,
                "Internal server error: " + ex.getMessage()));
    }
}
