package com.alibaba.himarket.repository;

import com.alibaba.himarket.entity.WorkerTeamProductEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WorkerTeamProductRepository
        extends JpaRepository<WorkerTeamProductEntity, String> {}
