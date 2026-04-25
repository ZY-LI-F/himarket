package com.alibaba.himarket.repository.agent;

import com.alibaba.himarket.entity.agent.AgentTaskRunEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentTaskRunRepository extends JpaRepository<AgentTaskRunEntity, Long> {

    Optional<AgentTaskRunEntity> findByTaskUid(String taskUid);
}
