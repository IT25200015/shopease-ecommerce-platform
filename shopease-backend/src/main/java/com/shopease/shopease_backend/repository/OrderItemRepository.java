package com.shopease.shopease_backend.repository;

import com.shopease.shopease_backend.model.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OrderItemRepository extends JpaRepository<OrderItem, Integer> {

    // Get all items within a specific order
    List<OrderItem> findByOrder_OrderID(Integer orderID);

    // Get all order items for a specific product (sales history)
    List<OrderItem> findByProduct_ProductID(Integer productID);

    // Auto-detect purchased item for reviews
    List<OrderItem> findByOrder_Customer_AccountIDAndProduct_ProductID(Integer customerId, Integer productId);

    // Auto-detect purchased item for reviews with specific order statuses using explicit JPQL
    @Query("SELECT oi FROM OrderItem oi WHERE oi.product.productID = :productId AND oi.order.customer.accountID = :accountId AND oi.order.orderStatus IN :statuses")
    List<OrderItem> findPurchasedItemsForReview(@Param("productId") Integer productId, @Param("accountId") Integer accountId, @Param("statuses") List<String> statuses);
}
