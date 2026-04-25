package com.alibaba.himarket.repository.agent;

import com.alibaba.himarket.entity.agent.AgentRoomConfigEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentRoomConfigRepository extends JpaRepository<AgentRoomConfigEntity, Long> {

    Optional<AgentRoomConfigEntity> findByRoomUid(String roomUid);
}
