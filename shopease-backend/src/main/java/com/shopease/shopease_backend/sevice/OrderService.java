package com.shopease.shopease_backend.service;

import com.shopease.shopease_backend.model.*;
import com.shopease.shopease_backend.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Service class for Order business logic.
 *
 * placeOrder() is the most complex method in the entire application.
 * It coordinates across 5 repositories in a single database transaction.
 * @Transactional guarantees ALL-OR-NOTHING: if any step fails, the entire
 * operation is rolled back and no partial data is saved.
 */
@Service
@RequiredArgsConstructor
public class OrderService {

    private final OrdersRepository ordersRepository;
    private final OrderItemRepository orderItemRepository;
    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final CampaignRepository campaignRepository;
    private final TransactionRepository transactionRepository;
    private final AccountRepository accountRepository;
    private final NotificationRepository notificationRepository;

    // ─── READ ──────────────────────────────────────────────────────────────────

    /** Returns all orders (Admin dashboard). */
    public List<Orders> getAllOrders() {
        return ordersRepository.findAll();
    }

    /** Returns one order by ID. */
    public Optional<Orders> getOrderById(Integer id) {
        return ordersRepository.findById(id);
    }

    /** Returns all orders placed by a specific customer. */
    public List<Orders> getOrdersByCustomer(Integer customerId) {
        return ordersRepository.findByCustomer_AccountID(customerId);
    }

    /** Returns orders filtered by status (e.g., "PENDING", "SHIPPED"). */
    public List<Orders> getOrdersByStatus(String status) {
        return ordersRepository.findByOrderStatus(status);
    }

    /** Returns orders containing products from a specific shop. */
    public List<Orders> getOrdersByShop(Integer shopId) {
        return ordersRepository.findOrdersByShopId(shopId);
    }

    /** Returns all items in a specific order. */
    public List<OrderItem> getOrderItems(Integer orderId) {
        return orderItemRepository.findByOrder_OrderID(orderId);
    }

    // ─── PLACE ORDER (Core Business Logic) ────────────────────────────────────

    /**
     * VIVA: Exposes checkout for JWT authenticated users via their email.
     */
    @Transactional
    public Orders checkoutByEmail(String email, String promoCode, String paymentMethod, String deliveryAddress) {
        Account customer = accountRepository.findByEmail(email)
            .orElseThrow(() -> new IllegalArgumentException("Customer not found with email: " + email));
        
        return placeOrder(customer.getAccountID(), promoCode, paymentMethod, deliveryAddress);
    }

    /**
     * Places a new order for a customer from their current cart.
     *
     * Step-by-Step Flow (explain this in your Viva!):
     * 1. Validate the customer has a cart with items.
     * 2. Validate each product's stock (all-or-nothing: don't place order if any item is out of stock).
     * 3. Create the Order record.
     * 4. Convert each CartItem into an OrderItem (price snapshot).
     * 5. Decrease stock for each product.
     * 6. Apply campaign discount if a valid promo code is provided.
     * 7. Create a placeholder Transaction (status: PENDING).
     * 8. Clear the cart.
     *
     * @param customerId   The ID of the customer placing the order.
     * @param promoCode    Optional promo code (can be null).
     * @param paymentMethod The chosen payment method.
     */
    @Transactional
    public Orders placeOrder(Integer customerId, String promoCode, String paymentMethod, String deliveryAddress) {

        // ── Step 1: Get the customer's cart ────────────────────────────────────
        Cart cart = cartRepository.findByCustomer_AccountID(customerId)
            .orElseThrow(() -> new IllegalArgumentException("No cart found for customer ID: " + customerId));

        List<CartItem> cartItems = cartItemRepository.findByCart_CartID(cart.getCartID());

        if (cartItems.isEmpty()) {
            throw new IllegalStateException("Cannot place an order with an empty cart.");
        }

        // ── Step 2: Validate stock for ALL items before touching anything ──────
        for (CartItem cartItem : cartItems) {
            Product product = cartItem.getProduct();
            if (product.getStockQuantity() < cartItem.getQuantity()) {
                throw new IllegalStateException(
                    "Insufficient stock for product '" + product.getProductName()
                    + "'. Available: " + product.getStockQuantity()
                    + ", In cart: " + cartItem.getQuantity()
                );
            }
        }

        // ── Step 3: Create the Order ───────────────────────────────────────────
        Orders newOrder = new Orders();
        // getReferenceById creates a JPA proxy (no SELECT query) — the correct way
        // to link a managed entity by ID without loading its full data.
        newOrder.setCustomer(accountRepository.getReferenceById(customerId));
        newOrder.setOrderStatus("PENDING");
        newOrder.setCreatedAt(LocalDate.now());
        newOrder.setDeliveryAddress(deliveryAddress);

        // ── Step 4: Apply Campaign (promo code) if provided ───────────────────
        float discount = 0f;
        if (promoCode != null && !promoCode.isBlank()) {
            Optional<Campaign> campaignOpt = campaignRepository.findByPromoCode(promoCode);
            if (campaignOpt.isPresent()) {
                Campaign campaign = campaignOpt.get();
                // Validate the campaign is still active and not expired
                if (Boolean.TRUE.equals(campaign.getIsActive())
                        && (campaign.getExpiryDate() == null || !campaign.getExpiryDate().isBefore(LocalDate.now()))) {
                        
                    // Validate usage limit
                    int actualUsage = campaign.getActualUsageCount() != null ? campaign.getActualUsageCount() : 0;
                    if (campaign.getUsageLimit() != null && actualUsage >= campaign.getUsageLimit()) {
                        throw new IllegalArgumentException("Promo code '" + promoCode + "' usage limit has been reached.");
                    }

                    newOrder.setCampaign(campaign);
                    discount = campaign.getDiscountValue();
                } else {
                    throw new IllegalArgumentException("Promo code '" + promoCode + "' is expired or inactive.");
                }
            } else {
                throw new IllegalArgumentException("Promo code '" + promoCode + "' is not valid.");
            }
        }

        // ── Step 4 (cont.): Compute gross total from cart items ────────────────
        float grossTotal = 0f;
        List<OrderItem> orderItemsToSave = new ArrayList<>();

        // Save the order first to get its generated ID (needed for OrderItem FKs)
        newOrder.setGrossTotal(0f); // temporary — will update after calculation
        Orders savedOrder = ordersRepository.save(newOrder);

        // ── Step 5: Convert CartItems → OrderItems & decrease stock ────────────
        for (CartItem cartItem : cartItems) {
            Product product = cartItem.getProduct();

            // Create an OrderItem (price snapshot — never changes even if product price changes later)
            OrderItem orderItem = new OrderItem();
            orderItem.setOrder(savedOrder);
            orderItem.setProduct(product);
            orderItem.setQuantity(cartItem.getQuantity());
            orderItem.setUnitPrice(cartItem.getPriceAtAddition());
            orderItem.setSubTotal(cartItem.getPriceAtAddition() * cartItem.getQuantity());
            orderItemsToSave.add(orderItem);

            grossTotal += orderItem.getSubTotal();

            // Decrease stock (in-memory, will be persisted by save below)
            int newStock = product.getStockQuantity() - cartItem.getQuantity();
            product.setStockQuantity(newStock);
            if (newStock == 0) {
                product.setStatus("OUT_OF_STOCK");
            }
            
            // LOW STOCK WARNING Logic: Trigger if stock drops below 5
            if (newStock < 5) {
                Shop shop = product.getShop();
                if (shop != null && shop.getOwner() != null) {
                    Notification alert = new Notification();
                    alert.setAccount(shop.getOwner()); // Notify the SHOP_OWNER
                    alert.setChannel("IN_APP");
                    alert.setType("SYSTEM_ALERT");
                    alert.setContent(String.format("LOW STOCK ALERT: '%s' only has %d unit(s) left in stock.", 
                        product.getProductName(), newStock));
                    alert.setStatus("PENDING");
                    alert.setSentAt(LocalDate.now());
                    notificationRepository.save(alert);
                }
            }

            productRepository.save(product);
        }

        orderItemRepository.saveAll(orderItemsToSave);

        // Apply discount
        float finalTotal = Math.max(0f, grossTotal - discount);

        // ── Step 6: Update Order with final total ──────────────────────────────
        savedOrder.setGrossTotal(finalTotal);
        ordersRepository.save(savedOrder);

        // ── Step 6.1: Update Campaign Metrics (if applicable) ──────────────────
        if (newOrder.getCampaign() != null) {
            Campaign campaign = newOrder.getCampaign();
            campaign.setActualUsageCount((campaign.getActualUsageCount() != null ? campaign.getActualUsageCount() : 0) + 1);
            campaign.setGeneratedRevenue((campaign.getGeneratedRevenue() != null ? campaign.getGeneratedRevenue() : 0f) + finalTotal);
            campaignRepository.save(campaign);
        }

        // ── Step 7: Create a PENDING Transaction record ────────────────────────
        Transaction transaction = new Transaction();
        transaction.setOrder(savedOrder);
        transaction.setNetAmount(finalTotal);
        transaction.setPaymentMethod(paymentMethod);
        transaction.setPaymentStatus("PENDING");
        transaction.setTimestamp(LocalDate.now());
        transactionRepository.save(transaction);

        // ── Step 8: Clear the cart ─────────────────────────────────────────────
        cartItemRepository.deleteByCart_CartID(cart.getCartID());
        cart.setUpdatedAt(LocalDate.now());
        cartRepository.save(cart);

        return savedOrder;
    }

    // ─── UPDATE ────────────────────────────────────────────────────────────────

    /**
     * Updates the status of an order.
     * Business Rule: A DELIVERED or CANCELLED order cannot be changed.
     */
    public Orders updateOrderStatus(Integer orderId, String newStatus) {
        Orders order = ordersRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found with ID: " + orderId));

        String currentStatus = order.getOrderStatus();
        if ("DELIVERED".equals(currentStatus) || "CANCELLED".equals(currentStatus)) {
            throw new IllegalStateException(
                "Order #" + orderId + " is already " + currentStatus + " and cannot be modified."
            );
        }

        order.setOrderStatus(newStatus);
        
        // VIVA FEATURE: Cross-Module Integration
        // Automatically generate an in-app notification for the customer
        if (order.getCustomer() != null) {
            Notification alert = new Notification();
            alert.setAccount(order.getCustomer());
            alert.setChannel("IN_APP");
            alert.setType("ORDER_UPDATE");
            alert.setContent("Your Order #" + orderId + " status has been updated to: " + newStatus);
            alert.setStatus("UNREAD");
            alert.setSentAt(LocalDate.now());
            notificationRepository.save(alert);
        }

        return ordersRepository.save(order);
    }

    // ─── DELETE ────────────────────────────────────────────────────────────────

    /** Deletes an order record (Admin only). */
    public void deleteOrder(Integer id) {
        if (!ordersRepository.existsById(id)) {
            throw new IllegalArgumentException("Order not found with ID: " + id);
        }
        ordersRepository.deleteById(id);
    }

    /**
     * Cancels a pre-shipment order by a customer.
     * Validates that the order belongs to the customer and is in PENDING state.
     * Restores the stock quantities for each product.
     */
    @Transactional
    public Orders cancelOrderByEmail(Integer orderId, String email) {
        Orders order = ordersRepository.findById(orderId)
            .orElseThrow(() -> new IllegalArgumentException("Order not found with ID: " + orderId));

        if (!order.getCustomer().getEmail().equals(email)) {
            throw new IllegalStateException("You are not authorized to cancel this order.");
        }

        if (!"PENDING".equals(order.getOrderStatus()) && 
            !"CONFIRMED".equals(order.getOrderStatus()) && 
            !"PROCESSING".equals(order.getOrderStatus())) {
            throw new IllegalStateException("Only pre-shipment orders can be cancelled. Current status: " + order.getOrderStatus());
        }

        order.setOrderStatus("CANCELLED");
        
        // Restore stock
        List<OrderItem> items = orderItemRepository.findByOrder_OrderID(orderId);
        for (OrderItem item : items) {
            Product product = item.getProduct();
            product.setStockQuantity(product.getStockQuantity() + item.getQuantity());
            if ("OUT_OF_STOCK".equals(product.getStatus()) && product.getStockQuantity() > 0) {
                product.setStatus("ACTIVE");
            }
            productRepository.save(product);
        }

        // Optional: Cancel the transaction if it exists
        Optional<Transaction> tx = transactionRepository.findByOrder_OrderID(orderId);
        if (tx.isPresent()) {
            Transaction transaction = tx.get();
            transaction.setPaymentStatus("REFUNDED");
            transactionRepository.save(transaction);
        }

        return ordersRepository.save(order);
    }
}
