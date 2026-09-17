package com.shopease.shopease_backend.controller;

import com.shopease.shopease_backend.model.OrderItem;
import com.shopease.shopease_backend.model.Orders;
import com.shopease.shopease_backend.dto.OrderRequestDTO;
import com.shopease.shopease_backend.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * OrderController – REST endpoints for Order management.
 *
 * VIVA: Why is @CrossOrigin removed here?
 *   @CrossOrigin(origins = "*") was previously present on this controller.
 *   However, our SecurityConfig already configures a central CorsConfigurationSource
 *   bean that applies to ALL endpoints with the correct settings.
 *
 *   The problem with having both:
 *   - SecurityConfig sets allowCredentials(true) with explicit origins.
 *   - @CrossOrigin(origins = "*") defaults to wildcard origin.
 *   - The CORS spec forbids wildcard origin + allowCredentials together.
 *   - Result: the browser accepts the preflight (OPTIONS → 200) but blocks
 *     the actual POST/GET request, producing a CORS network error.
 *
 *   Fix: Remove @CrossOrigin from all controllers. CORS is handled once,
 *   centrally, in SecurityConfig.corsConfigurationSource().
 */
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    /** GET /api/orders — all orders (Admin dashboard) */
    @GetMapping
    public ResponseEntity<List<Orders>> getAllOrders() {
        return ResponseEntity.ok(orderService.getAllOrders());
    }

    /** GET /api/orders/{id} — single order by ID */
    @GetMapping("/{id}")
    public ResponseEntity<Orders> getOrderById(@PathVariable Integer id) {
        return orderService.getOrderById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    /** GET /api/orders/customer/{customerId} — order history for a customer */
    @GetMapping("/customer/{customerId}")
    public ResponseEntity<List<Orders>> getByCustomer(@PathVariable Integer customerId) {
        return ResponseEntity.ok(orderService.getOrdersByCustomer(customerId));
    }

    /** GET /api/orders/shop/{shopId} — order history for a specific shop */
    @GetMapping("/shop/{shopId}")
    @PreAuthorize("hasAnyRole('SHOP_OWNER', 'ADMIN')")
    public ResponseEntity<List<Orders>> getByShop(@PathVariable Integer shopId) {
        return ResponseEntity.ok(orderService.getOrdersByShop(shopId));
    }

    /**
     * GET /api/orders/pending
     * Secure endpoint for Operations Dashboard — OPERATIONS role only.
     */
    @GetMapping("/pending")
    @PreAuthorize("hasRole('OPERATIONS')")
    public ResponseEntity<List<Orders>> getPendingOrders() {
        return ResponseEntity.ok(orderService.getOrdersByStatus("PENDING"));
    }

    /** GET /api/orders/status/{status} — filter by status (OPERATIONS only) */
    @GetMapping("/status/{status}")
    @PreAuthorize("hasRole('OPERATIONS')")
    public ResponseEntity<List<Orders>> getByStatus(@PathVariable String status) {
        return ResponseEntity.ok(orderService.getOrdersByStatus(status));
    }

    /** GET /api/orders/{orderId}/items — all line items in a specific order */
    @GetMapping("/{orderId}/items")
    public ResponseEntity<List<OrderItem>> getOrderItems(@PathVariable Integer orderId) {
        return ResponseEntity.ok(orderService.getOrderItems(orderId));
    }

    /**
     * POST /api/orders/checkout
     *
     * JWT Secured — CUSTOMER role required (enforced in SecurityConfig).
     *
     * VIVA: How does this know which customer is placing the order?
     *   @AuthenticationPrincipal injects the UserDetails object that was placed
     *   into the SecurityContext by JwtAuthenticationFilter. We extract the email
     *   via principal.getUsername() and use it to look up the customer in the DB.
     *   This is safer than accepting a customerId as a request param because the
     *   customer cannot fake another user's ID — the JWT determines the identity.
     *
     * VIVA: What does this endpoint do?
     *   Converts the authenticated customer's Cart into a confirmed Order:
     *   1. Validates stock for all cart items.
     *   2. Creates the Order record.
     *   3. Creates OrderItems (price snapshots).
     *   4. Decrements product stock.
     *   5. Applies promo code discount if provided.
     *   6. Creates a PENDING Transaction record.
     *   7. Clears the cart.
     */
    @PostMapping("/checkout")
    public ResponseEntity<Orders> checkout(
            @AuthenticationPrincipal UserDetails principal,
            @RequestBody OrderRequestDTO request) {
        String paymentMethod = request.getPaymentMethod() != null ? request.getPaymentMethod() : "CREDIT_CARD";
        Orders placed = orderService.checkoutByEmail(principal.getUsername(), request.getPromoCode(), paymentMethod, request.getDeliveryAddress());
        return ResponseEntity.status(HttpStatus.CREATED).body(placed);
    }

    /**
     * POST /api/orders/place?customerId=1&paymentMethod=CREDIT_CARD&promoCode=SAVE10
     * Legacy / Admin bypass — places an order by explicit customer ID.
     */
    @PostMapping("/place")
    public ResponseEntity<Orders> placeOrder(@RequestBody OrderRequestDTO request) {
        String paymentMethod = request.getPaymentMethod() != null ? request.getPaymentMethod() : "CREDIT_CARD";
        Orders placed = orderService.placeOrder(request.getCustomerId(), request.getPromoCode(), paymentMethod, request.getDeliveryAddress());
        return ResponseEntity.status(HttpStatus.CREATED).body(placed);
    }

    /** PATCH /api/orders/{id}/status?value=SHIPPED — update order status (OPERATIONS only) */
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('OPERATIONS')")
    public ResponseEntity<Orders> updateOrderStatus(
            @PathVariable Integer id, @RequestParam String value) {
        return ResponseEntity.ok(orderService.updateOrderStatus(id, value));
    }

    /** DELETE /api/orders/{id} — delete an order record (Admin only) */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteOrder(@PathVariable Integer id) {
        orderService.deleteOrder(id);
        return ResponseEntity.noContent().build();
    }
}
