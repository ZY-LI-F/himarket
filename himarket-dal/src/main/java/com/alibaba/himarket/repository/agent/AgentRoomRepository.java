package com.alibaba.himarket.repository.agent;

import com.alibaba.himarket.entity.agent.AgentRoomEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentRoomRepository extends JpaRepository<AgentRoomEntity, Long> {

    Optional<AgentRoomEntity> findByRoomUid(String roomUid);
}
