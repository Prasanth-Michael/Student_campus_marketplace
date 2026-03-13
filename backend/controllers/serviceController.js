const mongoose = require("mongoose");

const Service = require("../models/Service");

const getServices = async (req, res) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      search,
      provider,
      status = "active",
      sortBy = "newest"
    } = req.query;

    const filter = {};

    if (category) {
      filter.category = category;
    }

    if (provider && mongoose.Types.ObjectId.isValid(provider)) {
      filter.provider = provider;
    }

    if (status !== "all") {
      filter.status = status;
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) {
        filter.price.$gte = Number(minPrice);
      }
      if (maxPrice) {
        filter.price.$lte = Number(maxPrice);
      }
    }

    if (search) {
      filter.$text = { $search: search };
    }

    const sortMap = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      rating: { averageRating: -1, totalReviews: -1 }
    };

    const services = await Service.find(filter)
      .populate("provider", "name email department avatarUrl averageRating roles")
      .sort(sortMap[sortBy] || sortMap.newest);

    res.json({ count: services.length, services });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getServiceById = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id).populate(
      "provider",
      "name email department bio avatarUrl averageRating totalReviews roles"
    );

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    res.json({ service });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createService = async (req, res) => {
  try {
    const { title, description, category, price, deliveryTime, location, tags, images, status } = req.body;

    if (!title || !description || !category || price === undefined) {
      return res.status(400).json({ message: "Title, description, category, and price are required" });
    }

    const service = await Service.create({
      title,
      description,
      category,
      price,
      deliveryTime,
      location,
      tags: Array.isArray(tags) ? tags : [],
      images: Array.isArray(images) ? images : [],
      status: status || "active",
      provider: req.user._id
    });

    const populatedService = await service.populate("provider", "name email department avatarUrl");

    res.status(201).json({
      message: "Service created successfully",
      service: populatedService
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    const isOwner = service.provider.toString() === req.user._id.toString();
    const isAdmin = req.user.roles.includes("admin");

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Only the service owner can update this service" });
    }

    const fields = ["title", "description", "category", "price", "deliveryTime", "location", "tags", "images", "status"];
    fields.forEach((field) => {
      if (req.body[field] !== undefined) {
        service[field] = req.body[field];
      }
    });

    await service.save();
    await service.populate("provider", "name email department avatarUrl");

    res.json({
      message: "Service updated successfully",
      service
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    const isOwner = service.provider.toString() === req.user._id.toString();
    const isAdmin = req.user.roles.includes("admin");

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Only the service owner can delete this service" });
    }

    await service.deleteOne();

    res.json({ message: "Service deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyServices = async (req, res) => {
  try {
    const services = await Service.find({ provider: req.user._id }).sort({ createdAt: -1 });
    res.json({ count: services.length, services });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getMyServices
};
