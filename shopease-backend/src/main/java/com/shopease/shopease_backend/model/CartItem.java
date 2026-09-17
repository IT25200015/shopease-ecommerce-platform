package com.shopease.shopease_backend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

/**
 * A line item inside a Cart — links a Cart to a specific Product.
 * BUG FIX: Added @EqualsAndHashCode + @ToString exclusions.
 */
@Entity
@Table(name = "cart_item")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(exclude = {"cart", "product"})
public class CartItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "cartItemID")
    @EqualsAndHashCode.Include
    private Integer cartItemID;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cartID", nullable = false)
    @JsonBackReference("cart-items")
    private Cart cart;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "productID", nullable = false)
    @JsonBackReference("product-cartitems")
    private Product product;

    @Column(name = "quantity", nullable = false)
    private Integer quantity;

    // Price snapshot at time of adding — avoids price fluctuation issues
    @Column(name = "priceAtAddition", nullable = false)
    private Float priceAtAddition;
}
