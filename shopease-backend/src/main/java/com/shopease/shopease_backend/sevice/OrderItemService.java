package com.shopease.shopease_backend.service;

import com.shopease.shopease_backend.model.OrderItem;
import com.shopease.shopease_backend.repository.OrderItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class OrderItemService {

    private final OrderItemRepository orderItemRepository;

    public List<OrderItem> getAllOrderItems() {
        return orderItemRepository.findAll();
    }

    public Optional<OrderItem> getOrderItemById(Integer id) {
        return orderItemRepository.findById(id);
    }

    public List<OrderItem> getItemsByOrder(Integer orderId) {
        return orderItemRepository.findByOrder_OrderID(orderId);
    }

    public List<OrderItem> getItemsByProduct(Integer productId) {
        return orderItemRepository.findByProduct_ProductID(productId);
    }
}
