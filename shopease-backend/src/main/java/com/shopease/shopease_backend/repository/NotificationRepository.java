package com.shopease.shopease_backend.repository;

import com.shopease.shopease_backend.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Integer> {

    // Get all notifications for a specific account
    List<Notification> findByAccount_AccountID(Integer accountID);

    // Get notifications filtered by channel
    List<Notification> findByAccount_AccountIDAndChannel(Integer accountID, String channel);

    // Get notifications by status (PENDING, SENT, FAILED)
    List<Notification> findByStatus(String status);
}
