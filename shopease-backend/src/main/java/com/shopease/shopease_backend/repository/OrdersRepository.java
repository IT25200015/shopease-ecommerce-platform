package com.shopease.shopease_backend.repository;

import com.shopease.shopease_backend.model.Orders;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrdersRepository extends JpaRepository<Orders, Integer> {

    // Get order history for a specific customer
    List<Orders> findByCustomer_AccountID(Integer customerID);

    // Filter orders by status (admin dashboard)
    List<Orders> findByOrderStatus(String orderStatus);

    // Get all orders that used a specific campaign (analytics)
    List<Orders> findByCampaign_CampaignID(Integer campaignID);

    // Get orders for a customer filtered by status
    List<Orders> findByCustomer_AccountIDAndOrderStatus(Integer customerID, String orderStatus);

    // Get orders containing products from a specific shop
    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT o FROM Orders o JOIN o.orderItems oi JOIN oi.product p WHERE p.shop.shopID = :shopId")
    List<Orders> findOrdersByShopId(@org.springframework.data.repository.query.Param("shopId") Integer shopId);
}

