package com.shopease.shopease_backend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.List;

/**
 * A customer's shopping cart. Each customer has exactly one cart (OneToOne).
 * BUG FIX: Added @EqualsAndHashCode + @ToString exclusions.
 */
@Entity
@Table(name = "cart")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(exclude = {"customer", "cartItems"})
public class Cart {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "cartID")
    @EqualsAndHashCode.Include
    private Integer cartID;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customerID", nullable = false, unique = true)
    @JsonBackReference("account-cart")
    private Account customer;

    @Column(name = "updatedAt")
    private LocalDate updatedAt;

    @OneToMany(mappedBy = "cart", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference("cart-items")
    private List<CartItem> cartItems;
}
