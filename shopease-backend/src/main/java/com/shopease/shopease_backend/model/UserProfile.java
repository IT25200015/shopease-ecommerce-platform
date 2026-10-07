package com.shopease.shopease_backend.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

/**
 * Optional contact/preference profile for an Account (OneToOne).
 * BUG FIX: Added @EqualsAndHashCode + @ToString exclusions.
 */
@Entity
@Table(name = "user_profile")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
@ToString(exclude = {"account"})
public class UserProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "profileID")
    @EqualsAndHashCode.Include
    private Integer profileID;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "accountID", nullable = false, unique = true)
    @JsonBackReference("account-profile")
    private Account account;

    @Column(name = "phone")
    private String phone;

    @Column(name = "smsOptIn")
    private Boolean smsOptIn;

    @Column(name = "emailOptIn")
    private Boolean emailOptIn;
}
