const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const authorize  = require("../middleware/auth.middleware").authorize;
const protect = require("../middleware/auth.middleware").protect;
const conversationController = require("../controllers/conversation.controller");


router.post(
    "/create",
    protect, // 1. Yêu cầu đăng nhập
    conversationController.createConver // 4. Xử lý logic
);


router.get(
    "/",
    protect, // 1. Yêu cầu đăng nhập
    conversationController.getAllConvers // 3. Xử lý logic
);

router.post(
    "/create_message",
    protect, // 1. Yêu cầu đăng nhập
    conversationController.createMessage // 3. Xử lý logic
);

router.get(
    "/:id",
    protect, // 1. Yêu cầu đăng nhập
    conversationController.getMessages // 3. Xử lý logic
);

// Định nghĩa route: PUT /api/users/:id - Update conver
router.patch(
    "/:id",
    protect, // 1. Yêu cầu đăng nhập
    conversationController.updateConver // 4. Xử lý logic
);

router.delete(
    "/:id",
    protect, // 1. Yêu cầu đăng nhập
    conversationController.deleteConverById // 3. Xử lý logic
);

// // MỚI: Định nghĩa route để Trưởng/Phó phòng lấy danh sách nhân viên
// // GET /api/users/managed-officers
// router.get(
//     "/managed",
//     protect, // Yêu cầu đăng nhập
//     authorize("manager", "deputy_manager"), // Chỉ Trưởng phòng và Phó phòng được truy cập
//     userController.getManagedOfficers
// );

// // Định nghĩa route: GET /api/users/:id
// router.get(
//     "/:id",
//     protect, // 1. Yêu cầu đăng nhập
//     authorize("administrator", "director", "deputy_director"), // 2. Yêu cầu vai trò là Administrator, Giám đốc hoặc Phó giám đốc
//     userController.getUserById // 3. Xử lý logic
// );

// // Định nghĩa route: PUT /api/users/:id - Update user
// router.put(
//     "/:id",
//     protect, // 1. Yêu cầu đăng nhập
//     authorize("administrator"), // 2. Chỉ Administrator được phép update
//     updateUserValidationRules, // 3. Validation rules cho update
//     userController.updateUser // 4. Xử lý logic
// );

// // Định nghĩa route: PATCH /api/users/:id/status - Toggle user status (enable/disable)
// router.patch(
//     "/:id/status",
//     protect, // 1. Yêu cầu đăng nhập
//     authorize("administrator"), // 2. Chỉ Administrator được phép thay đổi status
//     userController.toggleUserStatus // 3. Xử lý logic
// );

// router.delete(
//     "/:id",
//     protect, // 1. Yêu cầu đăng nhập
//     authorize("administrator"), // 2. Yêu cầu vai trò là Administrator
//     userController.deleteUserById // 3. Xử lý logic
// );

// router.patch(
//     "/:id",
//     protect, // 1. Yêu cầu đăng nhập
//     authorize("administrator"), // 2. Yêu cầu vai trò là Administrator
//     userController.updateUserById // 3. Xử lý logic
// );

// router.patch(
//     "/:id/change-password",
//     protect, // 1. Yêu cầu đăng nhập
//     // authorize("administrator"),
//     userController.changePassword // 3. Xử lý logic
// );


module.exports = router;