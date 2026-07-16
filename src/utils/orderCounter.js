import counterModel from "../models/counterModel.js"

export const generateOrderNumber = async () => {
    const counter = await counterModel.findByIdAndUpdate(
        "order",
        {
            $inc: {
                sequenceValue: 1,
            }
        },
        {
            returnDocument: "after",
            upsert: true,
        }
    )
    return `CG${counter.sequenceValue.toString().padStart(6, "0")}`;

}