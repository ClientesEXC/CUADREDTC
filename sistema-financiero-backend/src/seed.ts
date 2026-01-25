import "reflect-metadata";
import { AppDataSource } from "./data-source";
import { Branch } from "./entity/Branch";
import { User } from "./entity/User";
import { Account, AccountType } from "./entity/Account";
import * as bcrypt from "bcryptjs";

async function main() {
    // 1. Iniciar conexión
    await AppDataSource.initialize();
    console.log("🌱 Iniciando el Sembrado de Datos (Seeding)...");

    // --- A. CREAR SUCURSALES ---
    const branchRepo = AppDataSource.getRepository(Branch);

    // Verificamos si ya existen para no duplicar
    const countBranches = await branchRepo.count();
    if (countBranches === 0) {
        console.log("... Creando Sucursales");

        const localA = new Branch();
        localA.name = "Local A - Centro";
        localA.address = "Av. Principal 123";
        await branchRepo.save(localA);

        const localB = new Branch();
        localB.name = "Local B - Norte";
        localB.address = "Calle Secundaria 456";
        await branchRepo.save(localB);
    }

    // Recuperamos las sucursales para asignarlas a usuarios/cuentas
    const localA = await branchRepo.findOneBy({ name: "Local A - Centro" });
    //const localB = await branchRepo.findOneBy({ name: "Local B - Norte" });

    // --- B. CREAR USUARIO ADMIN ---
    const userRepo = AppDataSource.getRepository(User);
    const adminExists = await userRepo.findOneBy({ username: "admin" });

    if (!adminExists && localA) {
        console.log("... Creando Usuario Admin");
        const admin = new User();
        admin.username = "admin";
        // ENCRIPTACIÓN: "admin123" se convierte en hash indescifrable
        admin.password = await bcrypt.hash("admin123", 10);
        admin.role = "admin";
        admin.branch = localA; // El admin base estará en Local A
        await userRepo.save(admin);
    }

    // --- C. CREAR CUENTAS BANCARIAS Y CAJAS ---
    const accountRepo = AppDataSource.getRepository(Account);
    const countAccounts = await accountRepo.count();

    if (countAccounts === 0) {
        console.log("... Creando Estructura Financiera");

        // 1. Caja Fuerte Central (Bóveda)
        const boveda = new Account();
        boveda.name = "Bóveda Central";
        boveda.accountNumber = "BOVEDA-01";
        boveda.type = AccountType.PHYSICAL;
        boveda.balance = 2000.00; // Capital inicial guardado
        await accountRepo.save(boveda);

        // 2. Banco Guayaquil
        const bcoGuayaquil = new Account();
        bcoGuayaquil.name = "Banco Guayaquil Principal";
        bcoGuayaquil.accountNumber = "BG-123456789";
        bcoGuayaquil.type = AccountType.BANK;
        bcoGuayaquil.bankName = "Guayaquil";
        bcoGuayaquil.balance = 1000.00; // Saldo inicial
        await accountRepo.save(bcoGuayaquil);

        // 3. Banco Pichincha
        const bcoPichincha = new Account();
        bcoPichincha.name = "Banco Pichincha Principal";
        bcoPichincha.accountNumber = "BP-987654321";
        bcoPichincha.type = AccountType.BANK;
        bcoPichincha.bankName = "Pichincha";
        bcoPichincha.balance = 1000.00;
        await accountRepo.save(bcoPichincha);

        // 4. Caja Chica - Usuario Local A (Ejemplo)
        // Nota: Cada cajero suele tener su propia "caja" asignada en el sistema
        const cajaCajero1 = new Account();
        cajaCajero1.name = "Caja Efectivo - Admin";
        cajaCajero1.accountNumber = "EFEC-ADMIN";
        cajaCajero1.type = AccountType.PHYSICAL;
        cajaCajero1.balance = 1000.00; // Base del día
        await accountRepo.save(cajaCajero1);
    }

    console.log("✅ ¡Sembrado completado con éxito!");
    process.exit(0);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});