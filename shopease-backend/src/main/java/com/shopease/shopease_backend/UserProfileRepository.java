package com.shopease.shopease_backend.repository;

import com.shopease.shopease_backend.model.UserProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserProfileRepository extends JpaRepository<UserProfile, Integer> {

    // Retrieve a user's profile by their account ID
    Optional<UserProfile> findByAccount_AccountID(Integer accountID);
}
