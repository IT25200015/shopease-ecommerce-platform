package com.shopease.shopease_backend.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDate;
import java.util.List;

/**
 * Represents a registered user account in the system.
 * Roles: CUSTOMER, SHOP_OWNER, ADMIN, FINANCE_OFFICER, MARKETING_STAFF
 *
 * Relationship notes (for your Viva):
 * - @JsonManagedReference is placed on the "parent" (One) side of One-to-Many.
 *   It tells Jackson to serialize this list normally.
 * - The child side uses @JsonBackReference, which tells Jackson to skip
 *   serializing the back-pointer to the parent, breaking the infinite loop.
 */
@Entity
@Table(name = "account")
@Data
@NoArgsConstructor
@AllArgsConstructor
// Exclude collection/relationship fields from equals, hashCode, and toString
// to prevent StackOverflowError caused by Lombok traversing bidirectional links.
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(exclude = {"userProfile", "cart", "addresses", "shops", "orders",
        "wishlistItems", "notifications", "auditLogs", "adBanners",
        "supportTickets", "reviews", "processedRefunds"})
public class Account {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "accountID")
    @EqualsAndHashCode.Include   // Only use PK for equals/hashCode — correct JPA practice
    private Integer accountID;

    @Column(name = "fullName", nullable = false)
    private String fullName;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "passwordHash", nullable = false)
    private String passwordHash;

    // Role examples: "CUSTOMER", "SHOP_OWNER", "ADMIN", "FINANCE_OFFICER", "MARKETING_STAFF"
    @Column(name = "role", nullable = false)
    private String role;

    // Status examples: "ACTIVE", "SUSPENDED", "BANNED"
    @Column(name = "status", nullable = false)
    private String status;

    @Column(name = "createdAt")
    private LocalDate createdAt;

    // ─── One-to-One ───────────────────────────────────────────────────────────
    // An Account has at most one UserProfile. mappedBy="account" refers to the
    // field name in UserProfile that holds the FK back to Account.
    @OneToOne(mappedBy = "account", cascade = CascadeType.ALL)
    @JsonManagedReference("account-profile")
    private UserProfile userProfile;

    // An Account has at most one Cart.
    @OneToOne(mappedBy = "customer", cascade = CascadeType.ALL)
    @JsonManagedReference("account-cart")
    private Cart cart;

    // ─── One-to-Many ─────────────────────────────────────────────────────────
    @OneToMany(mappedBy = "account", cascade = CascadeType.ALL)
    @JsonManagedReference("account-addresses")
    private List<Address> addresses;

    @OneToMany(mappedBy = "owner", cascade = CascadeType.ALL)
    @JsonManagedReference("account-shops")
    private List<Shop> shops;

    @OneToMany(mappedBy = "customer", cascade = CascadeType.ALL)
    @JsonManagedReference("account-orders")
    private List<Orders> orders;

    @OneToMany(mappedBy = "account", cascade = CascadeType.ALL)
    @JsonManagedReference("account-wishlist")
    private List<WishlistItem> wishlistItems;

    @OneToMany(mappedBy = "account", cascade = CascadeType.ALL)
    @JsonManagedReference("account-notifications")
    private List<Notification> notifications;

    @OneToMany(mappedBy = "account", cascade = CascadeType.ALL)
    @JsonManagedReference("account-auditlogs")
    private List<AuditLog> auditLogs;

    @OneToMany(mappedBy = "createdBy", cascade = CascadeType.ALL)
    @JsonManagedReference("account-banners")
    private List<AdBanner> adBanners;

    @OneToMany(mappedBy = "customer", cascade = CascadeType.ALL)
    @JsonManagedReference("account-tickets")
    private List<SupportTicket> supportTickets;

    @OneToMany(mappedBy = "customer", cascade = CascadeType.ALL)
    @JsonManagedReference("account-reviews")
    private List<Review> reviews;

    @OneToMany(mappedBy = "processedBy", cascade = CascadeType.ALL)
    @JsonManagedReference("account-refunds")
    private List<RefundRequest> processedRefunds;
}
