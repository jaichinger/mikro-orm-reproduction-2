import {
  Collection,
  Entity,
  ManyToOne,
  MikroORM,
  OneToMany,
  OneToOne,
  PrimaryKey,
  Property,
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

  @OneToOne({
    entity: () => Profile,
    ref: true,
    fieldNames: ["org_id", "profile_id"],
    ownColumns: ["profile_id"],
  })
  profile!: Ref<Profile>;

  @OneToOne({
    entity: () => Request,
    mappedBy: (ur) => ur.user,
    ref: true,
  })
  request?: Ref<Request>;
}

@Entity()
class Profile {
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

  @OneToOne({
    entity: () => User,
    mappedBy: (u) => u.profile,
    ref: true,
  })
  user?: Ref<User>;
}

@Entity()
class Request {
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

  @OneToOne({
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
    entities: [Organisation, User, Profile, Request],
    debug: ["query", "query-params"],
    allowGlobalContext: true, // only for testing
  });

  await orm.schema.refreshDatabase({ dropDb: true });

  const org = orm.em.create(Organisation, { id: 1, name: "org1" });

  const ws = orm.em.create(Profile, {
    org,
    id: 11,
    name: "profile1",
  });

  const user = orm.em.create(User, {
    org,
    id: 12,
    name: "user1",
    profile: ws,
  });

  orm.em.create(Request, {
    org,
    id: 13,
    name: "request1",
    user,
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

/// This does not work
test("partial composite foreign key from non-owning side as object", async () => {
  const user = await orm.em.findOneOrFail(User, {
    request: {
      id: 13,
    },
  });

  expect(user.name).toBe("user1");
});

// This works
test("partial composite foreign key from non-owning side as object (nested)", async () => {
  const profile = await orm.em.findOneOrFail(Profile, {
    user: {
      request: {
        id: 13,
      },
    },
  });

  expect(profile.name).toBe("profile1");
});
