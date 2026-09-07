import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Roles
  const adminRole = await prisma.role.create({
    data: { role_name: 'admin', description: 'System administrator' },
  })

  await prisma.role.create({
    data: { role_name: 'operator', description: 'Warehouse operator' },
  })

  // Admin user
  const hashedPw = await bcrypt.hash('password123', 10)
  await prisma.user.upsert({
    where: { email: 'admin@warehouse.com' },
    update: {},
    create: {
      name: 'Admin User',
      email: 'admin@warehouse.com',
      password_hash: hashedPw,
      role_id: adminRole.id,
    },
  })

  // Categories
  const categories = await Promise.all([
    prisma.productCategory.create({ data: { category_name: 'Electronics' } }),
    prisma.productCategory.create({ data: { category_name: 'Hardware' } }),
    prisma.productCategory.create({ data: { category_name: 'Packaging' } }),
    prisma.productCategory.create({ data: { category_name: 'Tools' } }),
  ])

  // Units
  const units = await Promise.all([
    prisma.unitOfMeasure.create({ data: { unit_name: 'Piece', symbol: 'pcs' } }),
    prisma.unitOfMeasure.create({ data: { unit_name: 'Kilogram', symbol: 'kg' } }),
    prisma.unitOfMeasure.create({ data: { unit_name: 'Box', symbol: 'box' } }),
    prisma.unitOfMeasure.create({ data: { unit_name: 'Meter', symbol: 'm' } }),
  ])

  // Warehouses with locations
  const wh1 = await prisma.warehouse.create({
    data: {
      name: 'Main Warehouse',
      address: '100 Industrial Ave, Zone A',
      locations: {
        create: [
          { location_code: 'Shelf A-01' },
          { location_code: 'Shelf A-02' },
          { location_code: 'Shelf B-01' },
          { location_code: 'Shelf B-02' },
          { location_code: 'Receiving Bay' },
        ],
      },
    },
    include: { locations: true },
  })

  const wh2 = await prisma.warehouse.create({
    data: {
      name: 'Secondary Warehouse',
      address: '200 Storage Blvd, Zone B',
      locations: {
        create: [
          { location_code: 'Rack 1A' },
          { location_code: 'Rack 1B' },
          { location_code: 'Overflow Area' },
        ],
      },
    },
    include: { locations: true },
  })

  // Suppliers
  await Promise.all([
    prisma.supplier.create({ data: { name: 'TechParts Global', email: 'orders@techparts.com', phone: '+1-555-0100', address: '123 Tech Blvd, CA' } }),
    prisma.supplier.create({ data: { name: 'MegaHardware Inc', email: 'supply@megahw.com', phone: '+1-555-0200', address: '456 Industrial Rd, TX' } }),
    prisma.supplier.create({ data: { name: 'PackMasters Ltd', email: 'info@packmasters.com', phone: '+1-555-0300', address: '789 Logistics Way, NY' } }),
  ])

  // Products
  const products = await Promise.all([
    prisma.product.create({ data: { name: 'Arduino Uno Rev3', sku: 'ELEC-001', category_id: categories[0].id, unit_id: units[0].id, reorder_level: 10 } }),
    prisma.product.create({ data: { name: 'Raspberry Pi 4 (4GB)', sku: 'ELEC-002', category_id: categories[0].id, unit_id: units[0].id, reorder_level: 5 } }),
    prisma.product.create({ data: { name: 'Steel Bolt M8x30', sku: 'HW-001', category_id: categories[1].id, unit_id: units[0].id, reorder_level: 100 } }),
    prisma.product.create({ data: { name: 'Hex Nut M8', sku: 'HW-002', category_id: categories[1].id, unit_id: units[0].id, reorder_level: 100 } }),
    prisma.product.create({ data: { name: 'Bubble Wrap Roll', sku: 'PKG-001', category_id: categories[2].id, unit_id: units[3].id, reorder_level: 20 } }),
    prisma.product.create({ data: { name: 'Digital Caliper 150mm', sku: 'TOOL-001', category_id: categories[3].id, unit_id: units[0].id, reorder_level: 3 } }),
  ])

  // Seed initial stock
  const loc1 = wh1.locations[0]
  const loc2 = wh1.locations[1]
  const loc3 = wh1.locations[2]

  const stockData = [
    { product_id: products[0].id, location_id: loc1.id, quantity: 45 },
    { product_id: products[1].id, location_id: loc1.id, quantity: 8 },
    { product_id: products[2].id, location_id: loc2.id, quantity: 350 },
    { product_id: products[3].id, location_id: loc2.id, quantity: 280 },
    { product_id: products[4].id, location_id: loc3.id, quantity: 15 },
    { product_id: products[5].id, location_id: loc3.id, quantity: 2 },
  ]

  for (const s of stockData) {
    await prisma.stockBalance.upsert({
      where: { product_id_location_id: { product_id: s.product_id, location_id: s.location_id } },
      update: { quantity: s.quantity },
      create: s,
    })

    await prisma.stockMove.create({
      data: {
        product_id: s.product_id,
        to_location: s.location_id,
        quantity: s.quantity,
        move_type: 'receipt',
        reference_table: 'seed',
        reference_id: 0,
      },
    })
  }

  console.log('✅ Seed complete!')
  console.log('   Admin login: admin@warehouse.com / password123')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
