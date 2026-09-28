const AppDataSource = require("../config/dataSource");
const bcrypt = require("bcrypt");
const { Not } = require("typeorm");

exports.createConver = async (converData) => {
    const converRepository = AppDataSource.getRepository("Conversations");
    // const { username, employee_code, password } = userData;

    const newConver = converRepository.create(converData);

    await converRepository.save(newConver);


    return {newConver};
};

exports.getAllConver = async (user_employee_code) => {
    const converRepository = AppDataSource.getRepository("Conversations");
    return await converRepository.find({
        where: {
            user_id: user_employee_code
        },
        order: {
            create_time: "DESC"
        }
    });
};

exports.createMessage = async (messageData) => {
    const messageRepository = AppDataSource.getRepository("Messages");
    // const { username, employee_code, password } = userData;

    const newMessage = messageRepository.create(messageData);

    await messageRepository.save(newMessage);


    return newMessage;
};

exports.getMessages = async (id) => {
    const messageRepository = AppDataSource.getRepository("Messages");
    return await messageRepository.find({
        where: {
            conversation_id: id
        },
        order: {
            create_time: "ASC"
        }
    });

};

exports.updatedConver = async (id, updateData) => {
    const converRepository = AppDataSource.getRepository("Conversations");
    
    // 1. Tìm user cần update
    const existingconver = await converRepository.findOne({
        where: { id: id },
    });

    if (!existingconver) {
        throw new Error("Không tìm thấy đoạn chat!");
    }

    await converRepository.update(
        { id: id },
        updateData
    );

    // 5. Lấy convert đã được cập nhật
    const updatedConver = await converRepository.findOne({
        where: { id: updateData.id || id },
    });

    return updatedConver;
};

exports.deleteConverById = async (id) => {
    const converRepository = AppDataSource.getRepository("Conversations");
    const conver = await converRepository.findOne({
        where: { id: id },
    });

    if (!conver) {
        throw new Error("Đoạn chat không tồn tại.");
    }

    // Ensure related messages are removed first to avoid FK constraint issues
    try {
        const messageRepository = AppDataSource.getRepository("Messages");
        await messageRepository.delete({ conversation_id: id });
    } catch (e) {
        // log and continue — if DB has cascade configured this may be unnecessary
        console.warn('[conversation.services] Failed to delete messages prior to conversation removal:', e && e.message ? e.message : e);
    }

    await converRepository.remove(conver);
    return { success: true, message: "Xóa đoạn chat thành công." };
}


