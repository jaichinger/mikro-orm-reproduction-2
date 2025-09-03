import {
  Collection,
  Entity,
  Filter,
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

  @ManyToOne({
    entity: () => Workspace,
    fieldNames: ["org_id", "workspace_id"],
    ownColumns: ["workspace_id"],
    ref: true,
  })
  workspace!: Ref<Workspace>;
}

@Entity()
@Filter<Profile>({
  name: "softDelete",
  cond: { deletedAt: { $eq: null } },
  default: true,
})
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

  @Property({ nullable: true })
  deletedAt?: Date;
}

@Entity()
@Filter<Workspace>({
  name: "softDelete",
  cond: { deletedAt: { $eq: null } },
  default: true,
})
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

  @OneToMany({
    entity: () => User,
    mappedBy: (u) => u.workspace,
    ref: true,
  })
  users = new Collection<User>(this);

  @Property({ nullable: true })
  deletedAt?: Date;
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

  const workspace = orm.em.create(Workspace, {
    org,
    id: 10,
    name: "workspace1",
  });

  const profile = orm.em.create(Profile, {
    org,
    id: 11,
    name: "profile1",
  });

  orm.em.create(User, {
    org,
    id: 12,
    name: "user1",
    profile,
    workspace,
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

test("populate 1:m collection via load()", async () => {
  const workspace = await orm.em.findOneOrFail(Workspace, {
    id: 10,
  });

  const users = await workspace.users.load();

  expect(users).toHaveLength(1);
});

test("populate 1:m collection via em.polulate()", async () => {
  const workspace = await orm.em.findOneOrFail(Workspace, {
    id: 10,
  });

  await orm.em.populate(workspace, ["users"]);

  expect(workspace.users.isInitialized(true)).toBe(true);
});

test("populate 1:1 via load()", async () => {
  const profile = await orm.em.findOneOrFail(Profile, {
    id: 11,
  });

  const user = await profile.user?.load();

  expect(user).toBeDefined();
  expect(user?.name).toBe("user1");
});
