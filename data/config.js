module.exports = {
    postgres: {
        dialect: 'postgres',
        username: 'postgresadmin',
        host: 'voicepostgresinstance.cr8ofuwvam5g.us-east-1.rds.amazonaws.com',
        database: 'voice',
        password: 'postgrespassword',
        port: 5432,
        pool: {
            max: 5,
            min: 0,
            idle: 20000,
            acquire: 20000
        }
    },
    pocket: {
        consumerKey: '63497-a7f14af78faac366dd755311'
    }
};
