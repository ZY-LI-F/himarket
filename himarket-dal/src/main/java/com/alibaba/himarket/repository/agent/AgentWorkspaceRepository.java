package com.alibaba.himarket.repository.agent;

import com.alibaba.himarket.entity.agent.AgentWorkspaceEntity;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AgentWorkspaceRepository extends JpaRepository<AgentWorkspaceEntity, Long> {

    Optional<AgentWorkspaceEntity> findByWorkspaceUid(String workspaceUid);

    Page<AgentWorkspaceEntity> findByTenantIdAndDeletedAtIsNull(String tenantId, Pageable pageable);

    Optional<AgentWorkspaceEntity> findByWorkspaceUidAndTenantIdAndDeletedAtIsNull(
            String workspaceUid, String tenantId);

    @Modifying
    @Query(
            """
            update AgentWorkspaceEntity workspace
            set workspace.active = false, workspace.updatedAt = CURRENT_TIMESTAMP
            where workspace.tenantId = :tenantId and workspace.deletedAt is null
            """)
    void deactivateTenantWorkspaces(@Param("tenantId") String tenantId);
}
