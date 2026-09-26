export const withTransaction = async (getConnection, work) => {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    const txQuery = async (sql, params = []) => {
      const [rows] = await connection.execute(sql, params);
      return { rows };
    };
    const result = await work(txQuery);
    await connection.commit();
    return result;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};
