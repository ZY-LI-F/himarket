package com.alibaba.himarket.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Entity
@Table(name = "worker_team_product_member")
@IdClass(WorkerTeamProductMemberEntity.WorkerTeamProductMemberId.class)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkerTeamProductMemberEntity {

    @Id
    @Column(name = "product_id", length = 64, nullable = false)
    private String productId;

    @Id
    @Column(name = "ordinal", nullable = false)
    private Integer ordinal;

    @Column(name = "role", length = 16, nullable = false)
    private String role;

    @Column(name = "ref_name", length = 128, nullable = false)
    private String refName;

    @Column(name = "ref_version", length = 64, nullable = false)
    private String refVersion;

    @ManyToOne
    @JoinColumn(
            name = "product_id",
            referencedColumnName = "product_id",
            insertable = false,
            updatable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private WorkerTeamProductEntity product;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WorkerTeamProductMemberId implements Serializable {

        private String productId;

        private Integer ordinal;
    }
}
