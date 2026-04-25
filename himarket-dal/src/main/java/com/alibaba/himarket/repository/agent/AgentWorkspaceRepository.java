package com.alibaba.himarket.repository.agent;

import com.alibaba.himarket.entity.agent.AgentWorkspaceEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentWorkspaceRepository extends JpaRepository<AgentWorkspaceEntity, Long> {

    Optional<AgentWorkspaceEntity> findByWorkspaceUid(String workspaceUid);
}
