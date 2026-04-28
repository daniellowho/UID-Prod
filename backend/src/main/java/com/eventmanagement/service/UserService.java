package com.eventmanagement.service;

import com.eventmanagement.exception.ResourceNotFoundException;
import com.eventmanagement.model.User;
import com.eventmanagement.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class UserService {

    @Autowired private UserRepository userRepository;

    public User findById(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
    }

    public List<User> findAll() {
        return userRepository.findAll();
    }

    public User updateUser(Long id, User updatedUser) {
        User user = findById(id);
        user.setFullName(updatedUser.getFullName());
        user.setPhoneNumber(updatedUser.getPhoneNumber());
        user.setEmail(updatedUser.getEmail());
        return userRepository.save(user);
    }

    public void deleteUser(Long id) {
        User user = findById(id);
        user.setActive(false);
        userRepository.save(user);
    }

    public long getTotalUsers() {
        return userRepository.count();
    }
}
