package com.temnhaninox.order.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "carts", schema = "order_schema")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Cart {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "customer_id", nullable = false, unique = true)
    private UUID customerId;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Builder.Default
    @OneToMany(mappedBy = "cart", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<CartItem> items = new ArrayList<>();

    @PrePersist
    @PreUpdate
    public void touchUpdatedAt() {
        this.updatedAt = Instant.now();
    }

    public void addItem(CartItem item) {
        item.setCart(this);
        this.items.add(item);
        this.updatedAt = Instant.now();
    }

    public void removeItem(CartItem item) {
        this.items.remove(item);
        item.setCart(null);
        this.updatedAt = Instant.now();
    }

    public void clearItems() {
        this.items.forEach(item -> item.setCart(null));
        this.items.clear();
        this.updatedAt = Instant.now();
    }
}
