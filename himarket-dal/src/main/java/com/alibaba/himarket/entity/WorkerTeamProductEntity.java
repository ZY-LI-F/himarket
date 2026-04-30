package com.alibaba.himarket.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

@Entity
@Table(name = "worker_team_product")
@Data
@EqualsAndHashCode(callSuper = true)
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkerTeamProductEntity extends BaseEntity {

    @Id
    @Column(name = "product_id", length = 64, nullable = false)
    private String productId;

    @Column(name = "name", length = 128, nullable = false)
    private String name;

    @Column(name = "version", length = 64, nullable = false)
    private String version;

    @Column(name = "business_domain", length = 128)
    private String businessDomain;

    @Column(name = "description", length = 1000)
    private String description;

    @Column(name = "status", length = 32, nullable = false)
    private String status;

    @Column(name = "visibility", length = 32, nullable = false)
    private String visibility;

    @Column(name = "pricing", columnDefinition = "json")
    private String pricing;

    @Column(name = "tags_json", columnDefinition = "json")
    private String tagsJson;

    @Builder.Default
    @OneToMany(
            mappedBy = "product",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.EAGER)
    @OrderBy("ordinal ASC")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<WorkerTeamProductMemberEntity> members = new ArrayList<>();

    public void replaceMembers(List<WorkerTeamProductMemberEntity> replacement) {
        members.clear();
        if (replacement == null) {
            return;
        }
        replacement.stream()
                .sorted(Comparator.comparing(WorkerTeamProductMemberEntity::getOrdinal))
                .forEach(this::addMember);
    }

    public void addMember(WorkerTeamProductMemberEntity member) {
        member.setProduct(this);
        member.setProductId(productId);
        members.add(member);
    }
}
