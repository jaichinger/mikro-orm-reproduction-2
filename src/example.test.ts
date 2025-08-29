import {
  Entity,
  ManyToOne,
  MikroORM,
  PrimaryKey,
  Property,
  ref,
  Ref,
} from "@mikro-orm/sqlite";

@Entity()
class Organisation {
  @PrimaryKey()
  id!: number;

  @Property()
  name!: string;
}

@Entity()
class User {
  @ManyToOne({
    entity: () => Organisation,
    fieldName: "org_id",
    primary: true,
    ref: true,
  })
  org!: Ref<Organisation>;

  @PrimaryKey()
  id!: number;

  @Property()
  name!: string;

  @ManyToOne({
    entity: () => Workspace,
    ref: true,
    fieldNames: ["org_id", "workspace_id"],
    ownColumns: ["workspace_id"],
  })
  workspace!: Ref<Workspace>;
}

@Entity()
class Workspace {
  @ManyToOne({
    entity: () => Organisation,
    fieldName: "org_id",
    primary: true,
    ref: true,
  })
  org!: Ref<Organisation>;

  @PrimaryKey()
  id!: number;

  @Property()
  name!: string;
}

@Entity()
class UserRequest {
  @ManyToOne({
    entity: () => Organisation,
    fieldName: "org_id",
    primary: true,
    ref: true,
  })
  org!: Ref<Organisation>;

  @PrimaryKey()
  id!: number;

  @Property()
  name!: string;

  @ManyToOne({
    entity: () => User,
    ref: true,
    fieldNames: ["org_id", "user_id"],
    ownColumns: ["user_id"],
  })
  user!: Ref<User>;
}

let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: ":memory:",
    entities: [Organisation, User, Workspace, UserRequest],
    debug: ["query", "query-params"],
    allowGlobalContext: true, // only for testing
  });

  await orm.schema.refreshDatabase({ dropDb: true });

  const org = orm.em.create(Organisation, { id: 1, name: "org1" });

  const ws = orm.em.create(Workspace, {
    org: org,
    id: 1,
    name: "ws1",
  });

  const user = orm.em.create(User, {
    org: org,
    id: 1,
    name: "user1",
    workspace: ws,
  });

  orm.em.create(UserRequest, {
    org: org,
    id: 1,
    name: "userRequest1",
    user: user,
  });

  await orm.em.flush();
  orm.em.clear();
});

afterAll(async () => {
  await orm.close(true);
});

afterEach(() => {
  orm.em.clear();
});

test("composite foreign key as array", async () => {
  const requests = await orm.em.find(
    UserRequest,
    {
      user: {
        workspace: [1, 1],
      },
    },
    {
      populate: ["user"],
    }
  );

  expect(requests).toHaveLength(1);
  expect(requests[0].name).toBe("userRequest1");
});

test("composite foreign key as ref", async () => {
  const requests = await orm.em.find(
    UserRequest,
    {
      user: {
        workspace: ref(Workspace, [1, 1]),
      },
    },
    {
      populate: ["user"],
    }
  );

  expect(requests).toHaveLength(1);
  expect(requests[0].name).toBe("userRequest1");
});

test("composite foreign key as object", async () => {
  const requests = await orm.em.find(
    UserRequest,
    {
      user: {
        workspace: { org: 1, id: 1 },
      },
    },
    {
      populate: ["user"],
    }
  );

  expect(requests).toHaveLength(1);
  expect(requests[0].name).toBe("userRequest1");
});
