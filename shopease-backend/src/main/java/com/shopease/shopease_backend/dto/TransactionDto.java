package com.shopease.shopease_backend.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class TransactionDto {
    private Integer transactionID;
    private Float netAmount;
    private String paymentMethod;
    private String paymentStatus;
    private LocalDate timestamp;
    private Integer orderID;
    private String customerName;
    private Boolean isArchived;
}
