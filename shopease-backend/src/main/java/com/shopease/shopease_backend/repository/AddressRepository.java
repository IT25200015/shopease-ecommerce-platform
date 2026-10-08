package com.shopease.shopease_backend.repository;

import com.shopease.shopease_backend.model.Address;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AddressRepository extends JpaRepository<Address, Integer> {

    // Retrieve all saved addresses for a specific customer
    List<Address> findByAccount_AccountID(Integer accountID);

    // Find the default address for a specific customer
    Optional<Address> findByAccount_AccountIDAndIsDefaultTrue(Integer accountID);
}
