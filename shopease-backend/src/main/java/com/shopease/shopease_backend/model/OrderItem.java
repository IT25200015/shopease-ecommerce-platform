package com.shopease.shopease_backend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;

/**
 * A line item within an Order.
 * BUG FIX: Added @EqualsAndHashCode + @ToString exclusions.
 */
@Entity
@Table(name = "order_item")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(exclude = {"order", "product", "review"})
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "orderItemID")
    @EqualsAndHashCode.Include
    private Integer orderItemID;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "orderID", nullable = false)
    @JsonBackReference("order-items")
    private Orders order;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "productID", nullable = false)
    @org.hibernate.annotations.NotFound(action = org.hibernate.annotations.NotFoundAction.IGNORE)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"cartItems", "orderItems", "wishlistItems", "reviews", "shop", "category", "hibernateLazyInitializer", "handler"})
    private Product product;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    // Price snapshot at the time of ordering — never changes
    @Column(name = "unitPrice", nullable = false)
    private Float unitPrice;

    // Stored computed value: quantity * unitPrice
    @Column(name = "subTotal", nullable = false)
    private Float subTotal;

    // OneToOne: One review per purchased order item (purchase-verified reviews)
    @OneToOne(mappedBy = "orderItem", cascade = CascadeType.ALL)
    @JsonManagedReference("orderitem-review")
    private Review review;
}
