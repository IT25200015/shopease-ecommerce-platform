package com.shopease.shopease_backend.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class RefundDto {
    private Integer refundID;
    private Integer transactionID;
    private Integer orderID;
    private String customerName;
    private Float amount;
    private String reason;
    private String status;
    private LocalDate processedDate;
}
