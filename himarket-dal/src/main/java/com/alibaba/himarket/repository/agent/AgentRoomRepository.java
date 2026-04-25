package com.alibaba.himarket.repository.agent;

import com.alibaba.himarket.entity.agent.AgentRoomEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentRoomRepository extends JpaRepository<AgentRoomEntity, Long> {

    Optional<AgentRoomEntity> findByRoomUid(String roomUid);

    List<AgentRoomEntity> findByWorkspaceUidAndTenantIdAndDeletedAtIsNullOrderByCreatedAtAsc(
            String workspaceUid, String tenantId);

    Optional<AgentRoomEntity> findByRoomUidAndTenantIdAndDeletedAtIsNull(
            String roomUid, String tenantId);
}
