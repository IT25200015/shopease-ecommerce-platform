package com.shopease.shopease_backend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.util.List;

/**
 * A customer's placed order.
 * BUG FIX: Added @EqualsAndHashCode + @ToString exclusions to stop infinite recursion.
 */
@Entity
@Table(name = "orders")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(exclude = {"customer", "campaign", "orderItems", "supportTickets", "transaction"})
public class Orders {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "orderID")
    @EqualsAndHashCode.Include
    private Integer orderID;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "customerID", nullable = false)
    @org.hibernate.annotations.NotFound(action = org.hibernate.annotations.NotFoundAction.IGNORE)
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"orders", "cart", "addresses", "shops", "wishlistItems", "notifications", "auditLogs", "adBanners", "supportTickets", "reviews", "processedRefunds"})
    private Account customer;

    // Nullable: order may or may not have a promo code applied
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaignID", nullable = true)
    @JsonBackReference("campaign-orders")
    private Campaign campaign;

    @Column(name = "grossTotal", nullable = false)
    private Float grossTotal;

    // Status: "PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"
    @Column(name = "orderStatus", nullable = false)
    private String orderStatus;

    @Column(name = "createdAt")
    private LocalDate createdAt;

    @Column(name = "deliveryAddress", columnDefinition = "TEXT")
    private String deliveryAddress;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL)
    @JsonManagedReference("order-items")
    private List<OrderItem> orderItems;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL)
    @JsonManagedReference("order-tickets")
    private List<SupportTicket> supportTickets;

    @OneToOne(mappedBy = "order", cascade = CascadeType.ALL)
    @JsonManagedReference("order-transaction")
    private Transaction transaction;
}
