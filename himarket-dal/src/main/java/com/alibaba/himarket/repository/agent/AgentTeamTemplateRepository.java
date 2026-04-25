package com.alibaba.himarket.repository.agent;

import com.alibaba.himarket.entity.agent.AgentTeamTemplateEntity;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AgentTeamTemplateRepository extends JpaRepository<AgentTeamTemplateEntity, Long> {

    Optional<AgentTeamTemplateEntity> findByTemplateId(String templateId);
}
